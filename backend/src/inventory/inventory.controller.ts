import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role, User } from '@prisma/client';
import * as XLSX from 'xlsx';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { InventoryService } from './inventory.service';

// Column headers for CSV / Excel exports
const EXPORT_HEADERS = [
  'description',
  'brand',
  'model',
  'sku',
  'serialNumber',
  'quantity',
  'costPrice',
  'salePrice',
  'totalCost',
  'totalSale',
  'profit',
  'margin',
  'dateAdded',
  'supplier',
  'notes',
  'createdAt',
] as const;

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── List with filters ────────────────────────────────────────────────────

  @Get()
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  // ─── Distinct brands ─────────────────────────────────────────────────────

  @Get('brands')
  getBrands() {
    return this.inventoryService.getDistinctBrands();
  }

  // ─── Summary cards ────────────────────────────────────────────────────────

  @Get('summary')
  getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.inventoryService.getSummary(dateFrom, dateTo);
  }

  // ─── Export CSV ───────────────────────────────────────────────────────────

  @Get('export/csv')
  async exportCsv(@Query() query: QueryInventoryDto, @Res() res: Response) {
    const rows = await this.inventoryService.findAllForExport(query);

    const csvLines: string[] = [EXPORT_HEADERS.join(',')];

    for (const row of rows) {
      const values = EXPORT_HEADERS.map((key) => {
        const val = row[key as keyof typeof row];
        if (val === null || val === undefined) return '';
        const str = String(val instanceof Date ? val.toISOString() : val);
        // Escape fields containing commas, quotes, or newlines
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      });
      csvLines.push(values.join(','));
    }

    const csv = csvLines.join('\r\n');
    const filename = `inventory-export-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── Export Excel ─────────────────────────────────────────────────────────

  @Get('export/excel')
  async exportExcel(@Query() query: QueryInventoryDto, @Res() res: Response) {
    const rows = await this.inventoryService.findAllForExport(query);

    const sheetData = [
      EXPORT_HEADERS as unknown as string[],
      ...rows.map((row) =>
        EXPORT_HEADERS.map((key) => {
          const val = row[key as keyof typeof row];
          if (val === null || val === undefined) return '';
          return val instanceof Date ? val.toISOString() : String(val);
        }),
      ),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const filename = `inventory-export-${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ─── Bulk import ──────────────────────────────────────────────────────────

  @Post('bulk-import')
  bulkImport(@Body() dto: BulkImportDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.bulkImport(dto, userId);
  }

  // ─── Get by SKU ───────────────────────────────────────────────────────────

  @Get('by-sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.inventoryService.findBySku(sku);
  }

  // ─── Get single item ──────────────────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOne(id);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateInventoryDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.create(dto, userId);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.update(id, dto, userId);
  }

  // ─── Delete (Admin only) ──────────────────────────────────────────────────

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.remove(id, userId);
  }
}
