import { Logger } from '@nestjs/common';
import { IOcrProvider, OcrResult } from '../ocr-provider.interface';

export class GoogleVisionProvider implements IOcrProvider {
  private readonly logger = new Logger(GoogleVisionProvider.name);
  private readonly configured: boolean;

  constructor(private readonly apiKey: string) {
    this.configured = Boolean(apiKey && apiKey.length > 0);
  }

  async processImage(filePath: string): Promise<OcrResult> {
    if (!this.configured) {
      throw new Error('Google Vision not configured');
    }

    this.logger.log(`[Google Vision] processImage called for: ${filePath}`);
    // Placeholder: in a real implementation, read the file, base64-encode it,
    // and POST to https://vision.googleapis.com/v1/images:annotate
    return this.buildPlaceholderResult();
  }

  async processImageBuffer(_buffer: Buffer): Promise<OcrResult> {
    if (!this.configured) {
      throw new Error('Google Vision not configured');
    }

    this.logger.log('[Google Vision] processImageBuffer called');
    // Placeholder: in a real implementation, base64-encode the buffer
    // and POST to https://vision.googleapis.com/v1/images:annotate
    return this.buildPlaceholderResult();
  }

  private buildPlaceholderResult(): OcrResult {
    return {
      rawText: '',
      rows: [],
      confidence: 0,
    };
  }
}
