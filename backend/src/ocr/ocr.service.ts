import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { IOcrProvider, OcrResult, OcrRow } from './ocr-provider.interface';
import { TesseractProvider } from './providers/tesseract.provider';
import { GoogleVisionProvider } from './providers/google-vision.provider';

const COST_ALIASES = ['cost', 'cost price', 'cp', 'purchase price', 'buy'];
const SALE_ALIASES = ['sale', 'sale price', 'sp', 'selling price', 'retail', 'sell'];
const QTY_ALIASES  = ['qty', 'quantity', 'pcs', 'pieces', 'units'];
const DESC_ALIASES = ['description', 'desc', 'item', 'product', 'watch', 'name'];

@Injectable()
export class OcrService {
  private readonly provider: IOcrProvider;
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly config: ConfigService) {
    const providerName = config.get<string>('OCR_PROVIDER', 'tesseract');
    if (providerName === 'google-vision') {
      const apiKey = config.get<string>('GOOGLE_VISION_API_KEY', '');
      this.provider = new GoogleVisionProvider(apiKey);
    } else {
      this.provider = new TesseractProvider();
    }
    this.logger.log(`OCR provider: ${providerName}`);
  }

  async processFile(filePath: string, mimeType?: string): Promise<OcrResult> {
    const ext = path.extname(filePath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'].includes(ext)) {
      return this.provider.processImage(filePath);
    }
    // For PDF or other types, fall back to image processing
    this.logger.warn(`Unsupported MIME type ${mimeType ?? ext}, attempting image OCR`);
    return this.provider.processImage(filePath);
  }

  async processBuffer(buffer: Buffer, _mimeType?: string): Promise<OcrResult> {
    return this.provider.processImageBuffer(buffer);
  }

  /**
   * Maps column header strings to canonical field names.
   * Keys in the returned object are the zero-based column index (as string).
   * Values are field names: 'costPrice' | 'salePrice' | 'quantity' | 'description'.
   */
  detectColumnMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    headers.forEach((h, i) => {
      const lower = h.toLowerCase().trim();
      if (COST_ALIASES.some((a) => lower.includes(a))) {
        mapping[String(i)] = 'costPrice';
      } else if (SALE_ALIASES.some((a) => lower.includes(a))) {
        mapping[String(i)] = 'salePrice';
      } else if (QTY_ALIASES.some((a) => lower.includes(a))) {
        mapping[String(i)] = 'quantity';
      } else if (DESC_ALIASES.some((a) => lower.includes(a))) {
        mapping[String(i)] = 'description';
      }
    });
    return mapping;
  }

  /**
   * Enhanced table parser for raw OCR text.
   * Detects column headers when present and maps data rows intelligently.
   */
  parseTableData(rawText: string): OcrRow[] {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    // Detect the first header-like line
    const headerIdx = lines.findIndex((l) => {
      const lower = l.toLowerCase();
      return (
        COST_ALIASES.some((k) => lower.includes(k)) ||
        SALE_ALIASES.some((k) => lower.includes(k))
      );
    });

    let columnMapping: Record<string, string> = {};
    if (headerIdx >= 0) {
      // Split the header line by whitespace to get approximate column headers
      const headerCols = lines[headerIdx].split(/\s{2,}|\t/).map((c) => c.trim());
      columnMapping = this.detectColumnMapping(headerCols);
    }

    const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines;

    return dataLines
      .map<OcrRow | null>((line) => {
        const nums = this.extractNumbers(line);
        if (!nums.length) return null;

        const textPart = line.replace(/[\d.,\s]+/g, ' ').trim();
        const row: OcrRow = { rawLine: line, confidence: 0.7 };

        if (textPart.length > 2) row.description = textPart;

        if (Object.keys(columnMapping).length > 0) {
          // Use detected column mapping to assign numbers
          const numericCols = Object.entries(columnMapping)
            .filter(([, field]) => field !== 'description')
            .sort(([a], [b]) => Number(a) - Number(b));

          numericCols.forEach(([, field], idx) => {
            if (nums[idx] !== undefined) {
              (row as unknown as Record<string, unknown>)[field] = nums[idx];
            }
          });
        } else {
          // Heuristic fallback: assign by position
          if (nums.length === 1) {
            row.salePrice = nums[0];
          } else if (nums.length === 2) {
            row.costPrice = nums[0];
            row.salePrice = nums[1];
          } else {
            const firstIsQty = Number.isInteger(nums[0]) && nums[0] < 100;
            if (firstIsQty) {
              row.quantity  = nums[0];
              row.costPrice = nums[1];
              row.salePrice = nums[2];
              if (nums[3] !== undefined) row.total = nums[3];
            } else {
              row.costPrice = nums[0];
              row.salePrice = nums[1];
              if (nums[2] !== undefined) row.total = nums[2];
            }
          }
        }

        return row;
      })
      .filter((r): r is OcrRow => r !== null);
  }

  /** Extracts all numeric values (including decimals and comma-separated) from a string. */
  extractNumbers(text: string): number[] {
    return (text.match(/\d[\d,]*\.?\d*/g) ?? [])
      .map((m) => parseFloat(m.replace(/,/g, '')))
      .filter((n) => !isNaN(n));
  }
}
