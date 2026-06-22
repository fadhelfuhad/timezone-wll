import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import * as compression from 'compression';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useLogger(logger);

  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const port = configService.get<number>('app.port', 3001);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const corsOriginsRaw = configService.get<string>('app.corsOrigins', '');

  const corsOrigins: string[] = corsOriginsRaw
    ? corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  // Security headers
  app.use(helmet());

  // Gzip compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new TransformInterceptor(),
  );

  // Swagger documentation (non-production)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Timezone W.L.L Inventory API')
      .setDescription('REST API for the Timezone W.L.L inventory management system')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('inventory', 'Inventory management')
      .addTag('analytics', 'Analytics and reporting')
      .addTag('imports', 'Bulk import operations')
      .addTag('ocr', 'OCR processing')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger docs available at http://localhost:${port}/docs`, 'Bootstrap');
  }

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(
    `Application running on port ${port} in ${nodeEnv} mode`,
    'Bootstrap',
  );
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
