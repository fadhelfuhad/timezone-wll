import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import { IOcrProvider, OcrResult, OcrRow } from '../ocr-provider.interface';

const COST_KEYS = ['cost', 'cost price', 'cp', 'purchase', 'buy price'];
const SALE_KEYS = ['sale', 'sale price', 'sp', 'selling', 'sell price', 'retail'];
const QTY_KEYS  = ['qty', 'quantity', 'pcs', 'pieces', 'units', 'count'];
const DESC_KEYS = ['description', 'desc', 'item', 'product', 'name', 'watch'];

export class TesseractProvider implements IOcrProvider {
  async processImage(filePath: string): Promise<OcrResult> {
    const buffer = fs.readFileSync(filePath);
    return this.processImageBuffer(buffer);
  }

  async processImageBuffer(buffer: Buffer): Promise<OcrResult> {
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(buffer);
      const rawText = data.text;
      const confidence = data.confidence / 100;
      const rows = this.parseRows(rawText, confidence);
      return { rawText, rows, confidence };
    } finally {
      await worker.terminate();
    }
  }

  private parseRows(text: string, defaultConfidence: number): OcrRow[] {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    // Try to detect header row
    const headerIdx = lines.findIndex((l) => {
      const lower = l.toLowerCase();
      return (
        COST_KEYS.some((k) => lower.includes(k)) ||
        SALE_KEYS.some((k) => lower.includes(k)) ||
        DESC_KEYS.some((k) => lower.includes(k))
      );
    });

    const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines;

    return dataLines
      .map((line) => {
        const numbers = this.extractNumbers(line);
        if (numbers.length === 0) return null;

        const row: OcrRow = { rawLine: line, confidence: defaultConfidence };

        // Heuristic: first large text block = description
        const textPart = line.replace(/[\d.,]+/g, '').trim();
        if (textPart.length > 3) row.description = textPart;

        // Assign numbers by position / count
        if (numbers.length === 1) {
          row.salePrice = numbers[0];
        } else if (numbers.length === 2) {
          row.costPrice = numbers[0];
          row.salePrice = numbers[1];
        } else if (numbers.length >= 3) {
          // If the first number looks like a small integer, treat it as quantity
          const firstIsQty = Number.isInteger(numbers[0]) && numbers[0] < 1000;
          const priceStart = firstIsQty ? 1 : 0;

          if (firstIsQty) row.quantity = numbers[0];
          row.costPrice = numbers[priceStart];
          row.salePrice = numbers[priceStart + 1];
          if (numbers.length > priceStart + 2) {
            row.total = numbers[priceStart + 2];
          }
        }

        return row;
      })
      .filter((r): r is OcrRow => r !== null);
  }

  private extractNumbers(text: string): number[] {
    const matches = text.match(/\d[\d,]*\.?\d*/g) ?? [];
    return matches
      .map((m) => parseFloat(m.replace(/,/g, '')))
      .filter((n) => !isNaN(n));
  }
}
