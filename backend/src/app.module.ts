import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';
import { WinstonModule } from 'nest-winston';
import * as Joi from 'joi';
import * as winston from 'winston';
import { diskStorage } from 'multer';
import * as path from 'path';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ImportsModule } from './imports/imports.module';
import { OcrModule } from './ocr/ocr.module';
import { HealthModule } from './health/health.module';
import { WorkspaceInterceptor } from './common/workspace/workspace';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .default('development'),
        PORT: Joi.number().default(3001),
        CORS_ORIGINS: Joi.string().allow('').default(''),
        API_PREFIX: Joi.string().default('api'),

        DATABASE_URL: Joi.string().required(),

        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

        UPLOAD_DIR: Joi.string().default('uploads'),
        UPLOAD_MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10 MB

        OCR_PROVIDER: Joi.string().valid('google-vision', 'tesseract').default('tesseract'),
        GOOGLE_VISION_API_KEY: Joi.string().optional().allow(''),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),

    // Rate limiting: generous global default (the dashboard fans out into
    // many requests per page). Sensitive routes tighten this with @Throttle.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),

    // Winston logging
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
        const isProduction = nodeEnv === 'production';

        return {
          transports: [
            new winston.transports.Console({
              level: isProduction ? 'warn' : 'debug',
              format: isProduction
                ? winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json(),
                  )
                : winston.format.combine(
                    winston.format.colorize(),
                    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                    winston.format.printf(({ timestamp, level, message, context }) => {
                      return `[${timestamp}] ${level} [${context ?? 'App'}]: ${message}`;
                    }),
                  ),
            }),
            // File transports only in non-production. Serverless/container hosts
            // (e.g. Vercel) have a read-only filesystem outside /tmp, so writing
            // to ./logs would crash the app on boot. In production, logs go to
            // stdout (Console) and are captured by the platform's log pipeline.
            ...(isProduction
              ? []
              : [
                  new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.json(),
                    ),
                  }),
                  new winston.transports.File({
                    filename: 'logs/combined.log',
                    format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.json(),
                    ),
                  }),
                ]),
          ],
        };
      },
    }),

    // Multer for file uploads
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadDir = configService.get<string>('upload.dir', 'uploads');
        const maxFileSize = configService.get<number>(
          'upload.maxFileSize',
          10 * 1024 * 1024,
        );

        return {
          storage: diskStorage({
            destination: uploadDir,
            filename: (_req, file, cb) => {
              const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
              const ext = path.extname(file.originalname);
              cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
          }),
          limits: {
            fileSize: maxFileSize,
          },
        };
      },
    }),

    // Feature modules
    PrismaModule,
    AuthModule,
    UsersModule,
    InventoryModule,
    AnalyticsModule,
    ImportsModule,
    OcrModule,
    HealthModule,
  ],
  providers: [
    // Enforce rate limiting globally. Without this guard the configured
    // ThrottlerModule limits are never applied to any route.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Runs each signed-in request inside its user's workspace (company or guest demo).
    {
      provide: APP_INTERCEPTOR,
      useClass: WorkspaceInterceptor,
    },
  ],
})
export class AppModule {}
