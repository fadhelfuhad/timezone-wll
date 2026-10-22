import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { currentWorkspace } from '../common/workspace/workspace';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { BulkImportDto, BulkImportItemDto } from './dto/bulk-import.dto';

// Computed-field formula helpers
function computeFields(
  costPrice: number,
  salePrice: number,
  quantity: number,
): {
  totalCost: number;
  totalSale: number;
  profit: number;
  margin: number;
} {
  const totalCost = costPrice * quantity;
  const totalSale = salePrice * quantity;
  const profit = totalSale - totalCost;
  const margin = totalSale === 0 ? 0 : (profit / totalSale) * 100;
  return { totalCost, totalSale, profit, margin };
}

function buildOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Prisma.InventoryItemOrderByWithRelationInput {
  return { [sortBy]: sortOrder };
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateInventoryDto, userId: string) {
    if (dto.salePrice < dto.costPrice) {
      throw new BadRequestException('salePrice must be greater than or equal to costPrice');
    }

    const quantity = dto.quantity ?? 1;
    const { totalCost, totalSale, profit, margin } = computeFields(
      dto.costPrice,
      dto.salePrice,
      quantity,
    );

    let item: Awaited<ReturnType<typeof this.prisma.inventoryItem.create>>;
    try {
      item = await this.prisma.inventoryItem.create({
        data: {
          workspace: currentWorkspace(),
          description: dto.description,
          brand: dto.brand,
          model: dto.model,
          sku: dto.sku,
          serialNumber: dto.serialNumber,
          quantity,
          costPrice: dto.costPrice,
          salePrice: dto.salePrice,
          totalCost,
          totalSale,
          profit,
          margin,
          dateAdded: dto.dateAdded ? new Date(dto.dateAdded) : undefined,
          supplier: dto.supplier,
          notes: dto.notes,
          createdById: userId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const fields = (err.meta?.target as string[])?.join(', ') ?? 'field';
        throw new ConflictException(`An item with this ${fields} already exists`);
      }
      throw err;
    }

    await this.prisma.auditLog.create({
      data: {
        workspace: currentWorkspace(),
        action: AuditAction.CREATE,
        entityType: 'InventoryItem',
        entityId: item.id,
        itemId: item.id,
        description: `Inventory item "${item.description}" created`,
        newValues: {
          description: item.description,
          brand: item.brand,
          model: item.model,
          sku: item.sku,
          quantity,
          costPrice: dto.costPrice,
          salePrice: dto.salePrice,
          totalCost,
          totalSale,
          profit,
          margin,
        },
        userId,
      },
    });

    return item;
  }

  // ─── Find All ──────────────────────────────────────────────────────────────

  async findAll(query: QueryInventoryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      brand,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (brand) {
      where.brand = { equals: brand, mode: 'insensitive' };
    }

    if (dateFrom || dateTo) {
      where.dateAdded = {};
      if (dateFrom) where.dateAdded.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setUTCHours(23, 59, 59, 999);
        where.dateAdded.lte = to;
      }
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    const aggregate = await this.prisma.inventoryItem.aggregate({
      where,
      _sum: { totalCost: true, totalSale: true, profit: true },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalCost: Number(aggregate._sum.totalCost ?? 0),
        totalSale: Number(aggregate._sum.totalSale ?? 0),
        totalProfit: Number(aggregate._sum.profit ?? 0),
      },
    };
  }

  // ─── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });

    if (!item || item.isDeleted) {
      throw new NotFoundException(`Inventory item with id ${id} not found`);
    }

    return item;
  }

  async findBySku(sku: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { sku } });

    if (!item || item.isDeleted) {
      throw new NotFoundException(`Inventory item with SKU "${sku}" not found`);
    }

    return item;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateInventoryDto, userId: string) {
    const existing = await this.findOne(id);

    const costPrice =
      dto.costPrice !== undefined ? dto.costPrice : Number(existing.costPrice);
    const salePrice =
      dto.salePrice !== undefined ? dto.salePrice : Number(existing.salePrice);

    if (salePrice < costPrice) {
      throw new BadRequestException('salePrice must be greater than or equal to costPrice');
    }

    const quantity = dto.quantity !== undefined ? dto.quantity : existing.quantity;
    const { totalCost, totalSale, profit, margin } = computeFields(costPrice, salePrice, quantity);

    const data: Prisma.InventoryItemUpdateInput = {
      totalCost,
      totalSale,
      profit,
      margin,
      updatedBy: { connect: { id: userId } },
    };

    if (dto.description !== undefined) data.description = dto.description;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.costPrice !== undefined) data.costPrice = dto.costPrice;
    if (dto.salePrice !== undefined) data.salePrice = dto.salePrice;
    if (dto.dateAdded !== undefined) data.dateAdded = new Date(dto.dateAdded);
    if (dto.supplier !== undefined) data.supplier = dto.supplier;
    if (dto.notes !== undefined) data.notes = dto.notes;

    let updated: Awaited<ReturnType<typeof this.prisma.inventoryItem.update>>;
    try {
      updated = await this.prisma.inventoryItem.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const fields = (err.meta?.target as string[])?.join(', ') ?? 'field';
        throw new ConflictException(`An item with this ${fields} already exists`);
      }
      throw err;
    }

    // Build field-level diff for audit log
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    const tracked = [
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
      'supplier',
      'notes',
    ] as const;

    for (const key of tracked) {
      const oldRaw = existing[key];
      const newRaw = updated[key];
      const oldVal =
        oldRaw !== null && typeof oldRaw === 'object' ? Number(oldRaw) : oldRaw;
      const newVal =
        newRaw !== null && typeof newRaw === 'object' ? Number(newRaw) : newRaw;
      if (oldVal !== newVal) {
        oldValues[key] = oldVal;
        newValues[key] = newVal;
      }
    }

    await this.prisma.auditLog.create({
      data: {
        workspace: currentWorkspace(),
        action: AuditAction.UPDATE,
        entityType: 'InventoryItem',
        entityId: id,
        itemId: id,
        description: `Inventory item "${updated.description}" updated`,
        oldValues: oldValues as Prisma.InputJsonValue,
        newValues: newValues as Prisma.InputJsonValue,
        userId,
      },
    });

    return updated;
  }

  // ─── Remove (soft delete) ──────────────────────────────────────────────────

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);

    const deleted = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: { connect: { id: userId } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        workspace: currentWorkspace(),
        action: AuditAction.DELETE,
        entityType: 'InventoryItem',
        entityId: id,
        itemId: id,
        description: `Inventory item "${existing.description}" deleted`,
        oldValues: { isDeleted: false },
        newValues: { isDeleted: true },
        userId,
      },
    });

    return { id: deleted.id, deleted: true };
  }

  // ─── Bulk Import ───────────────────────────────────────────────────────────

  async bulkImport(dto: BulkImportDto, userId: string) {
    const results: {
      created: number;
      failed: number;
      errors: { index: number; message: string }[];
    } = { created: 0, failed: 0, errors: [] };

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i] as BulkImportItemDto;

        try {
          if (item.salePrice < item.costPrice) {
            throw new Error('salePrice must be greater than or equal to costPrice');
          }

          const quantity = item.quantity ?? 1;
          const { totalCost, totalSale, profit, margin } = computeFields(
            item.costPrice,
            item.salePrice,
            quantity,
          );

          const created = await tx.inventoryItem.create({
            data: {
              workspace: currentWorkspace(),
              description: item.description,
              brand: item.brand,
              model: item.model,
              sku: item.sku,
              serialNumber: item.serialNumber,
              quantity,
              costPrice: item.costPrice,
              salePrice: item.salePrice,
              totalCost,
              totalSale,
              profit,
              margin,
              dateAdded: item.dateAdded ? new Date(item.dateAdded) : undefined,
              supplier: item.supplier,
              notes: item.notes,
              createdById: userId,
              importId: dto.importId,
            },
          });

          await tx.auditLog.create({
            data: {
              workspace: currentWorkspace(),
              action: AuditAction.IMPORT,
              entityType: 'InventoryItem',
              entityId: created.id,
              itemId: created.id,
              description: `Inventory item "${created.description}" created via bulk import`,
              newValues: {
                description: created.description,
                brand: created.brand,
                quantity,
              },
              userId,
            },
          });

          results.created++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            index: i,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    });

    return results;
  }

  // ─── Distinct brands ──────────────────────────────────────────────────────

  async getDistinctBrands(): Promise<string[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { isDeleted: false, brand: { not: '' } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand).filter(Boolean);
  }

  // ─── Summary Cards ─────────────────────────────────────────────────────────

  async getSummary(dateFrom?: string, dateTo?: string) {
    const where: Prisma.InventoryItemWhereInput = { isDeleted: false };

    if (dateFrom || dateTo) {
      where.dateAdded = {};
      if (dateFrom) where.dateAdded.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setUTCHours(23, 59, 59, 999);
        where.dateAdded.lte = to;
      }
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [aggregate, avgMarginResult, totalItems, addedToday, addedThisMonth] =
      await Promise.all([
        this.prisma.inventoryItem.aggregate({
          where,
          _sum: { totalCost: true, totalSale: true, profit: true },
        }),
        this.prisma.inventoryItem.aggregate({
          where,
          _avg: { margin: true },
        }),
        this.prisma.inventoryItem.count({ where }),
        this.prisma.inventoryItem.count({
          where: { isDeleted: false, createdAt: { gte: startOfToday } },
        }),
        this.prisma.inventoryItem.count({
          where: { isDeleted: false, createdAt: { gte: startOfMonth } },
        }),
      ]);

    return {
      totalItems,
      totalCost: Number(aggregate._sum.totalCost ?? 0),
      totalSale: Number(aggregate._sum.totalSale ?? 0),
      totalProfit: Number(aggregate._sum.profit ?? 0),
      avgMargin: Number(avgMarginResult._avg.margin ?? 0),
      addedToday,
      addedThisMonth,
    };
  }

  // ─── Export helpers ────────────────────────────────────────────────────────

  async findAllForExport(query: QueryInventoryDto) {
    const { search, brand, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } =
      query;

    const where: Prisma.InventoryItemWhereInput = { isDeleted: false };

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (brand) where.brand = { equals: brand, mode: 'insensitive' };

    if (dateFrom || dateTo) {
      where.dateAdded = {};
      if (dateFrom) where.dateAdded.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setUTCHours(23, 59, 59, 999);
        where.dateAdded.lte = to;
      }
    }

    return this.prisma.inventoryItem.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
    });
  }
}
