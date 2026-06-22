export interface OcrRow {
  description?: string;
  costPrice?: number;
  salePrice?: number;
  quantity?: number;
  total?: number;
  rawLine: string;
  confidence: number;
}

export interface OcrResult {
  rawText: string;
  rows: OcrRow[];
  confidence: number;
}

export interface IOcrProvider {
  processImage(filePath: string): Promise<OcrResult>;
  processImageBuffer(buffer: Buffer): Promise<OcrResult>;
}
