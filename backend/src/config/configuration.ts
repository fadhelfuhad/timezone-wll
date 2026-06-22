export interface AppConfig {
  app: {
    port: number;
    nodeEnv: string;
    corsOrigins: string;
    apiPrefix: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  database: {
    url: string;
  };
  upload: {
    dir: string;
    maxFileSize: number;
  };
  ocr: {
    provider: 'google' | 'tesseract';
    googleVisionApiKey: string;
  };
}

export default (): AppConfig => ({
  app: {
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    corsOrigins: process.env['CORS_ORIGINS'] ?? '',
    apiPrefix: process.env['API_PREFIX'] ?? 'api',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] ?? '',
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? '',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },
  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  upload: {
    dir: process.env['UPLOAD_DIR'] ?? 'uploads',
    maxFileSize: parseInt(
      process.env['UPLOAD_MAX_FILE_SIZE'] ?? String(10 * 1024 * 1024),
      10,
    ),
  },
  ocr: {
    provider: (process.env['OCR_PROVIDER'] as 'google' | 'tesseract') ?? 'google',
    googleVisionApiKey: process.env['GOOGLE_VISION_API_KEY'] ?? '',
  },
});
