import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import {
  FileType,
  ImportStatus,
  RowStatus,
  Role,
  Prisma,
  ConflictResolution,
  ImportMode,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { OcrService } from '../ocr/ocr.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  ApproveImportDto,
  UpdateImportRowDto,
  ResolveConflictsDto,
} from './dto/create-import.dto';

interface ParsedRow {
  description?: string;
  costPrice?: number;
  salePrice?: number;
  quantity?: number;
  brand?: string;
  model?: string;
  supplier?: string;
  sku?: string;
  serialNumber?: string;
  dateAdded?: string;
  notes?: string;
  rawLine?: string;
  confidence: number;
}

interface ConflictData {
  existingItemId: string;
  existingItem: Record<string, unknown>;
  confidence: number;
  reasons: string[];
}

// ─── Fuzzy matching helpers ────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Dice coefficient bigram similarity 0-1
function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let intersection = 0;
  for (const b of ba) if (bb.has(b)) intersection++;
  return (2 * intersection) / (ba.size + bb.size);
}

// Remove brand token from a string before description comparison so that
// two items sharing only a brand name don't generate a false description match.
function stripBrand(text: string, brand: string): string {
  if (!brand) return normalize(text);
  const nb = normalize(brand);
  return normalize(text)
    .split(' ')
    .filter((t) => t !== nb && !nb.includes(t))
    .join(' ');
}

function computeConflictScore(
  row: ParsedRow,
  item: Record<string, unknown>,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // SKU exact match → definite duplicate
  if (row.sku && item.sku && normalize(String(row.sku)) === normalize(String(item.sku))) {
    return { score: 100, reasons: ['Exact SKU match'] };
  }

  // Model match — exact or near-exact only (0.92+); short alphanumeric model numbers
  // differ by one character and score ~0.83 which is NOT a real match
  const modelSim = row.model ? diceSimilarity(row.model, String(item.model ?? '')) : 0;
  if (modelSim >= 0.92) {
    score += 50;
    reasons.push(`Model match (${row.model})`);
  } else if (modelSim >= 0.75) {
    score += 20;
    reasons.push(`Partial model match`);
  }

  // Description match — strip brand first; skip if either description is too short
  // (short descriptions like "test 3" / "test 4" produce misleading similarity scores)
  const rowBrand = row.brand ?? '';
  const itemBrand = String(item.brand ?? '');
  const rowDescStripped = stripBrand(row.description ?? '', rowBrand);
  const itemDescStripped = stripBrand(String(item.description ?? ''), itemBrand);
  const descSim =
    rowDescStripped.length >= 15 && itemDescStripped.length >= 15
      ? diceSimilarity(rowDescStripped, itemDescStripped)
      : 0;
  if (descSim > 0.85) {
    score += 25;
    reasons.push(`Very similar description`);
  } else if (descSim > 0.75) {
    score += 10;
    reasons.push(`Partially similar description`);
  }

  // Identical prices — tiebreaker only when model already scored
  const costMatch =
    row.costPrice !== undefined &&
    Math.abs(Number(row.costPrice) - Number(item.costPrice)) < 0.01;
  const saleMatch =
    row.salePrice !== undefined &&
    Math.abs(Number(row.salePrice) - Number(item.salePrice)) < 0.01;
  if (costMatch && saleMatch && score >= 20) {
    score += 10;
    reasons.push(`Identical prices`);
  }

  return { score: Math.min(score, 99), reasons };
}

// ─── Column header aliases for intelligent mapping ─────────────────────────────

const FIELD_ALIASES: Record<string, string[]> = {
  description: ['description', 'desc', 'item', 'product', 'watch', 'name', 'title', 'watch name', 'item name', 'product name'],
  brand: ['brand', 'make', 'manufacturer', 'marque', 'label'],
  model: ['model', 'model number', 'model no', 'reference', 'ref', 'ref no', 'model ref'],
  sku: ['sku', 'item code', 'code', 'article', 'part number', 'part no', 'item no', 'item number', 'product code'],
  serialNumber: ['serial', 'serial number', 'serial no', 'sn', 's/n'],
  costPrice: ['cost', 'cost price', 'cp', 'purchase price', 'buy price', 'unit cost', 'buying price', 'wholesale'],
  salePrice: ['sale', 'sale price', 'sp', 'selling price', 'retail', 'sell', 'price', 'retail price', 'sell price'],
  quantity: ['qty', 'quantity', 'pcs', 'pieces', 'units', 'count', 'stock', 'amount'],
  supplier: ['supplier', 'vendor', 'source', 'from', 'distributor'],
  dateAdded: ['date', 'date added', 'purchase date', 'acquired', 'acquisition date', 'received date'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments', 'memo', 'additional info'],
};

function detectField(header: string): string | null {
  const h = normalize(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (h === alias || h.includes(alias)) return field;
    }
  }
  return null;
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocr: OcrService,
    private readonly inventory: InventoryService,
  ) {}

  // ─── Create (upload + process) ─────────────────────────────────────────────

  async create(file: Express.Multer.File, userId: string, role: Role, importMode: ImportMode | string = 'APPEND') {
    if ((importMode as string) === 'REPLACE' && role !== Role.ADMIN && (role as string) !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only administrators can use Replace mode');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let fileType: FileType;

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) fileType = FileType.IMAGE;
    else if (ext === '.pdf') fileType = FileType.PDF;
    else if (['.xlsx', '.xls'].includes(ext)) fileType = FileType.EXCEL;
    else if (ext === '.csv') fileType = FileType.CSV;
    else throw new BadRequestException(`Unsupported file type: ${ext}`);

    const importRecord = await this.prisma.inventoryImport.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        fileType,
        fileSize: file.size,
        filePath: file.path,
        status: ImportStatus.PROCESSING,
        importMode,
        createdById: userId,
      },
    });

    try {
      let rows: ParsedRow[] = [];
      let ocrConfidence = 1.0;

      if (fileType === FileType.EXCEL) {
        rows = this.processExcel(file.path);
      } else if (fileType === FileType.CSV) {
        rows = this.processCsv(file.path);
      } else {
        const result = await this.ocr.processFile(file.path, file.mimetype);
        ocrConfidence = result.confidence;
        rows = result.rows.map((r) => ({
          description: r.description,
          costPrice: r.costPrice,
          salePrice: r.salePrice,
          quantity: r.quantity,
          rawLine: r.rawLine,
          confidence: r.confidence,
        }));
      }

      // Conflict detection against existing inventory
      const existingItems = await this.prisma.inventoryItem.findMany({
        where: { isDeleted: false },
        select: {
          id: true, description: true, brand: true, model: true,
          sku: true, costPrice: true, salePrice: true, quantity: true, supplier: true,
        },
      });

      let totalConflicts = 0;

      const importRows = await Promise.all(
        rows.map(async (row, idx) => {
          let conflictData: ConflictData | null = null;
          let bestScore = 0;

          for (const item of existingItems) {
            const { score, reasons } = computeConflictScore(row, item as Record<string, unknown>);
            if (score > bestScore && score >= 60) {
              bestScore = score;
              conflictData = {
                existingItemId: item.id,
                existingItem: {
                  id: item.id,
                  description: item.description,
                  brand: item.brand,
                  model: item.model,
                  sku: item.sku,
                  costPrice: Number(item.costPrice),
                  salePrice: Number(item.salePrice),
                  quantity: item.quantity,
                  supplier: item.supplier,
                },
                confidence: bestScore,
                reasons,
              };
            }
          }

          if (conflictData) totalConflicts++;

          return this.prisma.inventoryImportRow.create({
            data: {
              importId: importRecord.id,
              rowNumber: idx + 1,
              rawData: { rawLine: row.rawLine ?? '', ...row },
              parsedData: {
                description: row.description,
                costPrice: row.costPrice,
                salePrice: row.salePrice,
                quantity: row.quantity ?? 1,
                brand: row.brand,
                model: row.model,
                supplier: row.supplier,
                sku: row.sku,
                serialNumber: row.serialNumber,
                dateAdded: row.dateAdded,
                notes: row.notes,
              },
              confidence: row.confidence,
              conflictData: conflictData ? (conflictData as unknown as Prisma.InputJsonValue) : undefined,
              status:
                row.costPrice !== undefined && row.salePrice !== undefined
                  ? RowStatus.PARSED
                  : RowStatus.ERROR,
              errorMessage:
                row.costPrice === undefined || row.salePrice === undefined
                  ? 'Could not extract price data'
                  : undefined,
            },
          });
        }),
      );

      // For REPLACE mode — capture backup snapshot
      let backupSnapshot: Prisma.InputJsonValue | undefined;
      if ((importMode as string) === 'REPLACE') {
        const allCurrent = await this.prisma.inventoryItem.findMany({
          where: { isDeleted: false },
        });
        backupSnapshot = allCurrent.map((i) => ({
          ...i,
          costPrice: Number(i.costPrice),
          salePrice: Number(i.salePrice),
          totalCost: Number(i.totalCost),
          totalSale: Number(i.totalSale),
          profit: Number(i.profit),
          margin: Number(i.margin),
        })) as unknown as Prisma.InputJsonValue;
      }

      await this.prisma.inventoryImport.update({
        where: { id: importRecord.id },
        data: {
          status: ImportStatus.PREVIEW,
          ocrConfidence,
          totalRows: rows.length,
          processedRows: importRows.filter((r) => r.status === RowStatus.PARSED).length,
          failedRows: importRows.filter((r) => r.status === RowStatus.ERROR).length,
          conflictsDetected: totalConflicts,
          ...(backupSnapshot !== undefined && { backupSnapshot }),
        },
      });

      return this.findOne(importRecord.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Processing error';
      this.logger.error(`Import processing failed: ${message}`);
      await this.prisma.inventoryImport.update({
        where: { id: importRecord.id },
        data: { status: ImportStatus.FAILED, errorMessage: message },
      });
      throw err;
    }
  }

  // ─── Resolve conflicts ─────────────────────────────────────────────────────

  async resolveConflicts(importId: string, dto: ResolveConflictsDto) {
    const importRecord = await this.findOne(importId);
    if (importRecord.status === ImportStatus.APPROVED) {
      throw new BadRequestException('Cannot modify an already approved import');
    }

    // Restore to PREVIEW if it was cancelled/failed — allows resuming via Continue
    if (importRecord.status === ImportStatus.FAILED) {
      await this.prisma.inventoryImport.update({
        where: { id: importId },
        data: { status: ImportStatus.PREVIEW },
      });
    }

    await Promise.all(
      dto.resolutions.map(({ rowId, resolution, resolvedData }) =>
        this.prisma.inventoryImportRow.update({
          where: { id: rowId, importId },
          data: {
            resolution,
            ...(resolvedData !== undefined && { resolvedData: resolvedData as Prisma.InputJsonValue }),
          },
        }),
      ),
    );

    // Update resolved count
    const resolved = await this.prisma.inventoryImportRow.count({
      where: { importId, resolution: { not: null } },
    });

    await this.prisma.inventoryImport.update({
      where: { id: importId },
      data: { conflictsResolved: resolved },
    });

    return this.findOne(importId);
  }

  // ─── Find All ──────────────────────────────────────────────────────────────

  async findAll(userId: string, role: Role) {
    const where = (role as string) === 'ADMIN' || (role as string) === 'SUPER_ADMIN' ? {} : { createdById: userId };
    return this.prisma.inventoryImport.findMany({
      where,
      include: {
        _count: { select: { importRows: true, items: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const record = await this.prisma.inventoryImport.findUnique({
      where: { id },
      include: { importRows: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!record) throw new NotFoundException(`Import ${id} not found`);
    return record;
  }

  // ─── Update a single row ───────────────────────────────────────────────────

  async updateRow(importId: string, rowId: string, dto: UpdateImportRowDto) {
    const row = await this.prisma.inventoryImportRow.findFirst({
      where: { id: rowId, importId },
    });
    if (!row) throw new NotFoundException(`Row ${rowId} not found in import ${importId}`);

    return this.prisma.inventoryImportRow.update({
      where: { id: rowId },
      data: {
        ...(dto.parsedData !== undefined && { parsedData: dto.parsedData as Prisma.InputJsonValue }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  // ─── Approve ───────────────────────────────────────────────────────────────

  async approve(importId: string, dto: ApproveImportDto, userId: string) {
    const importRecord = await this.findOne(importId);

    if (importRecord.status === ImportStatus.APPROVED) {
      throw new BadRequestException('Import has already been approved');
    }

    // Check all conflicts resolved for REPLACE mode
    const unresolvedConflicts = importRecord.importRows.filter(
      (r) => r.conflictData && !r.resolution,
    );
    if (unresolvedConflicts.length > 0 && (importRecord.importMode as string) === 'REPLACE') {
      throw new BadRequestException(
        `${unresolvedConflicts.length} conflict(s) must be resolved before replacing inventory`,
      );
    }

    const results = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as string[] };
    const startTime = Date.now();

    // REPLACE mode: soft-delete all active items. The partial unique index on sku
    // (WHERE "isDeleted" = false) means soft-deleted rows no longer participate in
    // the uniqueness check, so new items can be inserted with the same SKUs.
    if ((importRecord.importMode as string) === 'REPLACE') {
      await this.prisma.$executeRaw`UPDATE "inventory_items" SET "isDeleted" = true WHERE "isDeleted" = false`;
    }

    for (const rowApproval of dto.rows) {
      const row = importRecord.importRows.find((r) => r.id === rowApproval.rowId);
      if (!row) continue;

      // Apply conflict resolution
      const resolution = row.resolution;
      if (resolution === ConflictResolution.KEEP_EXISTING || resolution === ConflictResolution.SKIP) {
        results.skipped++;
        await this.prisma.inventoryImportRow.update({
          where: { id: row.id },
          data: { status: RowStatus.SKIPPED },
        });
        continue;
      }

      const conflictData = row.conflictData as ConflictData | null;
      const data = (
        (row.resolvedData as Record<string, unknown>) ??
        (rowApproval.parsedData as Record<string, unknown>) ??
        (row.parsedData as Record<string, unknown>)
      );

      try {
        if (
          resolution === ConflictResolution.MERGE &&
          conflictData?.existingItemId
        ) {
          // Update existing item
          const qty = Number(data.quantity ?? 1);
          const cost = Number(data.costPrice ?? 0);
          const sale = Number(data.salePrice ?? 0);
          await this.inventory.update(
            conflictData.existingItemId,
            {
              description: data.description ? String(data.description) : undefined,
              brand: data.brand ? String(data.brand) : undefined,
              model: data.model ? String(data.model) : undefined,
              quantity: qty,
              costPrice: cost,
              salePrice: sale,
              supplier: data.supplier ? String(data.supplier) : undefined,
              notes: data.notes ? String(data.notes) : undefined,
            },
            userId,
          );
          results.updated++;
        } else if (resolution === ConflictResolution.CREATE_NEW) {
          // Duplicate without SKU
          await this.inventory.create(
            {
              description: String(data.description ?? 'Unknown'),
              brand: String(data.brand ?? 'Unknown'),
              model: String(data.model ?? 'Unknown'),
              costPrice: Number(data.costPrice ?? 0),
              salePrice: Number(data.salePrice ?? 0),
              quantity: Number(data.quantity ?? 1),
              supplier: data.supplier ? String(data.supplier) : undefined,
              notes: data.notes ? String(data.notes) : undefined,
              dateAdded: data.dateAdded ? String(data.dateAdded) : undefined,
            },
            userId,
          );
          results.created++;
        } else {
          // USE_IMPORTED or no conflict — create normally
          await this.inventory.create(
            {
              description: String(data.description ?? 'Unknown'),
              brand: String(data.brand ?? 'Unknown'),
              model: String(data.model ?? 'Unknown'),
              costPrice: Number(data.costPrice ?? 0),
              salePrice: Number(data.salePrice ?? 0),
              quantity: Number(data.quantity ?? 1),
              sku: data.sku ? String(data.sku) : undefined,
              serialNumber: data.serialNumber ? String(data.serialNumber) : undefined,
              supplier: data.supplier ? String(data.supplier) : undefined,
              notes: data.notes ? String(data.notes) : undefined,
              dateAdded: data.dateAdded ? String(data.dateAdded) : undefined,
            },
            userId,
          );
          results.created++;
        }

        await this.prisma.inventoryImportRow.update({
          where: { id: row.id },
          data: { status: RowStatus.APPROVED },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.failed++;
        results.errors.push(`Row ${row.rowNumber}: ${message}`);
        await this.prisma.inventoryImportRow.update({
          where: { id: row.id },
          data: { status: RowStatus.ERROR, errorMessage: message },
        });
      }
    }

    const duration = Date.now() - startTime;
    const importReport = {
      importMode: importRecord.importMode,
      totalProcessed: dto.rows.length,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      failed: results.failed,
      errors: results.errors,
      duration,
      completedAt: new Date().toISOString(),
    };

    await this.prisma.inventoryImport.update({
      where: { id: importId },
      data: {
        status: ImportStatus.APPROVED,
        processedRows: results.created + results.updated,
        failedRows: results.failed,
        skippedRows: results.skipped,
        importReport: importReport as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'IMPORT',
        entityType: 'InventoryImport',
        entityId: importId,
        description: `Import ${importRecord.importMode} approved: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`,
        newValues: importReport as unknown as Prisma.InputJsonValue,
        userId,
      },
    });

    return { ...results, duration, importReport };
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────

  async cancel(importId: string, userId: string) {
    const record = await this.findOne(importId);

    if (record.status === ImportStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel an already approved import');
    }

    this.logger.log(`Import ${importId} cancelled by user ${userId}`);

    return this.prisma.inventoryImport.update({
      where: { id: importId },
      data: { status: ImportStatus.FAILED },
    });
  }

  // ─── Excel parsing ─────────────────────────────────────────────────────────

  processExcel(filePath: string): ParsedRow[] {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];

    return data.map((row) => {
      // Intelligent header detection
      const mapped: Record<string, unknown> = {};
      for (const [header, value] of Object.entries(row)) {
        const field = detectField(header);
        if (field && !mapped[field]) mapped[field] = value;
        else if (!mapped[header]) mapped[header] = value; // keep raw if unrecognised
      }

      const costRaw = mapped.costPrice ?? row['Cost Price'] ?? row['costPrice'] ?? row['Cost'] ?? row['cost'];
      const saleRaw = mapped.salePrice ?? row['Sale Price'] ?? row['salePrice'] ?? row['Sale'] ?? row['sale'];

      return {
        description: String(mapped.description ?? row['Description'] ?? row['description'] ?? row['Item'] ?? ''),
        costPrice: costRaw !== '' ? parseFloat(String(costRaw)) : undefined,
        salePrice: saleRaw !== '' ? parseFloat(String(saleRaw)) : undefined,
        quantity: mapped.quantity ? parseInt(String(mapped.quantity), 10) : 1,
        brand: String(mapped.brand ?? row['Brand'] ?? row['brand'] ?? ''),
        model: String(mapped.model ?? row['Model'] ?? row['model'] ?? ''),
        supplier: mapped.supplier ? String(mapped.supplier) : undefined,
        sku: (mapped.sku || row['SKU'] || row['sku']) ? String(mapped.sku ?? row['SKU'] ?? row['sku']) : undefined,
        serialNumber: (mapped.serialNumber) ? String(mapped.serialNumber) : undefined,
        dateAdded: mapped.dateAdded ? String(mapped.dateAdded) : undefined,
        notes: mapped.notes ? String(mapped.notes) : undefined,
        confidence: 0.95,
      };
    });
  }

  // ─── CSV parsing ───────────────────────────────────────────────────────────

  processCsv(filePath: string): ParsedRow[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const colMap: Record<number, string> = {};
    headers.forEach((h, i) => {
      const field = detectField(h);
      if (field) colMap[i] = field;
    });

    return lines.slice(1).map((line) => {
      const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''));
      const row: Record<string, unknown> = {};

      vals.forEach((v, i) => {
        const field = colMap[i] ?? headers[i];
        if (field) row[field] = v;
      });

      return {
        description: row.description ? String(row.description) : undefined,
        costPrice: row.costPrice ? parseFloat(String(row.costPrice)) : undefined,
        salePrice: row.salePrice ? parseFloat(String(row.salePrice)) : undefined,
        quantity: row.quantity ? parseInt(String(row.quantity), 10) : undefined,
        brand: row.brand ? String(row.brand) : undefined,
        model: row.model ? String(row.model) : undefined,
        supplier: row.supplier ? String(row.supplier) : undefined,
        sku: row.sku ? String(row.sku) : undefined,
        serialNumber: row.serialNumber ? String(row.serialNumber) : undefined,
        dateAdded: row.dateAdded ? String(row.dateAdded) : undefined,
        notes: row.notes ? String(row.notes) : undefined,
        confidence: 0.95,
      };
    });
  }
}
