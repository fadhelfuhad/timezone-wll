import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildDateFilter({ dateFrom, dateTo }: DateRangeFilter) {
    const filter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) filter.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setUTCHours(23, 59, 59, 999);
      filter.lte = d;
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private buildWhere({ dateFrom, dateTo }: DateRangeFilter) {
    const dateFilter = this.buildDateFilter({ dateFrom, dateTo });
    return {
      isDeleted: false,
      ...(dateFilter ? { dateAdded: dateFilter } : {}),
    };
  }

  /**
   * Build parameterized date-range SQL fragments for raw queries.
   * Values are bound as query parameters (never string-interpolated), so the
   * clauses are immune to SQL injection. Inputs must be ISO date strings —
   * callers validate this at the DTO layer; any non-date value makes Postgres
   * reject the cast rather than execute attacker SQL.
   */
  private rawDateClauses({ dateFrom, dateTo }: DateRangeFilter): {
    from: Prisma.Sql;
    to: Prisma.Sql;
  } {
    return {
      from: dateFrom
        ? Prisma.sql`AND "dateAdded" >= ${dateFrom}::date`
        : Prisma.empty,
      to: dateTo
        ? Prisma.sql`AND "dateAdded" < (${dateTo}::date + INTERVAL '1 day')`
        : Prisma.empty,
    };
  }

  // ─── 1. Profit Summary ────────────────────────────────────────────────────────

  async getProfitSummary({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const where = this.buildWhere({ dateFrom, dateTo });

    const agg = await this.prisma.inventoryItem.aggregate({
      where,
      _sum: {
        profit: true,
        totalCost: true,
        totalSale: true,
        quantity: true,
      },
      _avg: {
        margin: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalProfit: Number(agg._sum.profit ?? 0),
      totalCost: Number(agg._sum.totalCost ?? 0),
      totalSale: Number(agg._sum.totalSale ?? 0),
      avgMargin: Number(agg._avg.margin ?? 0),
      totalItems: agg._count.id,
      totalQuantity: agg._sum.quantity ?? 0,
    };
  }

  // ─── 2. Profit by Day ────────────────────────────────────────────────────────

  async getProfitByDay({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const { from, to } = this.rawDateClauses({ dateFrom, dateTo });

    const rows = await this.prisma.$queryRaw<
      {
        yr: number;
        mo: number;
        dy: number;
        total_profit: string;
        total_cost: string;
        total_sale: string;
        item_count: string;
      }[]
    >(
      Prisma.sql`
      SELECT
        EXTRACT(YEAR  FROM "dateAdded")::int AS yr,
        EXTRACT(MONTH FROM "dateAdded")::int AS mo,
        EXTRACT(DAY   FROM "dateAdded")::int AS dy,
        SUM(profit)::text                    AS total_profit,
        SUM("totalCost")::text               AS total_cost,
        SUM("totalSale")::text               AS total_sale,
        COUNT(id)::text                      AS item_count
      FROM inventory_items
      WHERE "isDeleted" = false
        ${from}
        ${to}
      GROUP BY 1, 2, 3
      ORDER BY 1 ASC, 2 ASC, 3 ASC
      `,
    );

    return rows.map((r) => ({
      year: r.yr,
      month: r.mo,
      day: r.dy,
      label: `${String(r.dy).padStart(2, '0')} ${(MONTH_NAMES[r.mo - 1] ?? '').slice(0, 3)}`,
      totalProfit: Number(r.total_profit),
      totalCost: Number(r.total_cost),
      totalSale: Number(r.total_sale),
      itemCount: Number(r.item_count),
    }));
  }

  // ─── 3. Profit by Month ───────────────────────────────────────────────────────

  async getProfitByMonth({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const { from, to } = this.rawDateClauses({ dateFrom, dateTo });

    const rows = await this.prisma.$queryRaw<
      {
        yr: number;
        mo: number;
        total_profit: string;
        total_cost: string;
        total_sale: string;
        item_count: string;
      }[]
    >(
      Prisma.sql`
      SELECT
        EXTRACT(YEAR  FROM "dateAdded")::int  AS yr,
        EXTRACT(MONTH FROM "dateAdded")::int  AS mo,
        SUM(profit)::text                     AS total_profit,
        SUM("totalCost")::text                AS total_cost,
        SUM("totalSale")::text                AS total_sale,
        COUNT(id)::text                       AS item_count
      FROM inventory_items
      WHERE "isDeleted" = false
        ${from}
        ${to}
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
      `,
    );

    return rows.map((r) => ({
      year: r.yr,
      month: r.mo,
      monthName: MONTH_NAMES[r.mo - 1] ?? '',
      totalProfit: Number(r.total_profit),
      totalCost: Number(r.total_cost),
      totalSale: Number(r.total_sale),
      itemCount: Number(r.item_count),
    }));
  }

  // ─── 3. Profit by Year ────────────────────────────────────────────────────────

  async getProfitByYear({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const { from, to } = this.rawDateClauses({ dateFrom, dateTo });

    const rows = await this.prisma.$queryRaw<
      {
        yr: number;
        total_profit: string;
        total_cost: string;
        total_sale: string;
        item_count: string;
      }[]
    >(
      Prisma.sql`
      SELECT
        EXTRACT(YEAR FROM "dateAdded")::int AS yr,
        SUM(profit)::text                   AS total_profit,
        SUM("totalCost")::text              AS total_cost,
        SUM("totalSale")::text              AS total_sale,
        COUNT(id)::text                     AS item_count
      FROM inventory_items
      WHERE "isDeleted" = false
        ${from}
        ${to}
      GROUP BY 1
      ORDER BY 1 ASC
      `,
    );

    return rows.map((r) => ({
      year: r.yr,
      totalProfit: Number(r.total_profit),
      totalCost: Number(r.total_cost),
      totalSale: Number(r.total_sale),
      itemCount: Number(r.item_count),
    }));
  }

  // ─── 4. Profit by Brand ───────────────────────────────────────────────────────

  async getProfitByBrand({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const where = this.buildWhere({ dateFrom, dateTo });

    const groups = await this.prisma.inventoryItem.groupBy({
      by: ['brand'],
      where,
      _sum: {
        profit: true,
        totalCost: true,
        totalSale: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        margin: true,
      },
      orderBy: {
        _sum: {
          profit: 'desc',
        },
      },
      take: 10,
    });

    return groups.map((g) => ({
      brand: g.brand,
      totalProfit: Number(g._sum.profit ?? 0),
      totalCost: Number(g._sum.totalCost ?? 0),
      totalSale: Number(g._sum.totalSale ?? 0),
      itemCount: g._count.id,
      avgMargin: Number(g._avg.margin ?? 0),
    }));
  }

  // ─── 5. Profit by Product ─────────────────────────────────────────────────────

  async getProfitByProduct({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const where = this.buildWhere({ dateFrom, dateTo });

    const groups = await this.prisma.inventoryItem.groupBy({
      by: ['brand', 'model'],
      where,
      _sum: {
        profit: true,
        totalCost: true,
        totalSale: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          profit: 'desc',
        },
      },
      take: 20,
    });

    return groups.map((g) => ({
      brand: g.brand,
      model: g.model,
      totalProfit: Number(g._sum.profit ?? 0),
      totalCost: Number(g._sum.totalCost ?? 0),
      totalSale: Number(g._sum.totalSale ?? 0),
      itemCount: g._count.id,
    }));
  }

  // ─── 6. Cost vs Sale by Month ─────────────────────────────────────────────────

  async getCostVsSaleByMonth({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const { from, to } = this.rawDateClauses({ dateFrom, dateTo });

    const rows = await this.prisma.$queryRaw<
      {
        yr: number;
        mo: number;
        total_cost: string;
        total_sale: string;
        profit: string;
      }[]
    >(
      Prisma.sql`
      SELECT
        EXTRACT(YEAR  FROM "dateAdded")::int AS yr,
        EXTRACT(MONTH FROM "dateAdded")::int AS mo,
        SUM("totalCost")::text               AS total_cost,
        SUM("totalSale")::text               AS total_sale,
        SUM(profit)::text                    AS profit
      FROM inventory_items
      WHERE "isDeleted" = false
        ${from}
        ${to}
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
      `,
    );

    return rows.map((r) => ({
      year: r.yr,
      month: r.mo,
      monthName: MONTH_NAMES[r.mo - 1] ?? '',
      totalCost: Number(r.total_cost),
      totalSale: Number(r.total_sale),
      profit: Number(r.profit),
    }));
  }

  // ─── 7. Inventory by Brand (pie chart) ───────────────────────────────────────

  async getInventoryByBrand({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const where = this.buildWhere({ dateFrom, dateTo });

    const groups = await this.prisma.inventoryItem.groupBy({
      by: ['brand'],
      where,
      _sum: {
        totalSale: true,
      },
    });

    const grandTotal = groups.reduce(
      (acc, g) => acc + Number(g._sum.totalSale ?? 0),
      0,
    );

    return groups
      .map((g) => {
        const totalSaleValue = Number(g._sum.totalSale ?? 0);
        return {
          brand: g.brand,
          totalSaleValue,
          percentage: grandTotal > 0 ? (totalSaleValue / grandTotal) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalSaleValue - a.totalSaleValue);
  }

  // ─── 8. Profit Growth (cumulative running total) ──────────────────────────────

  async getProfitGrowth({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const { from, to } = this.rawDateClauses({ dateFrom, dateTo });

    const rows = await this.prisma.$queryRaw<
      {
        yr: number;
        mo: number;
        monthly_profit: string;
        cumulative_profit: string;
      }[]
    >(
      Prisma.sql`
      SELECT
        yr,
        mo,
        monthly_profit::text,
        SUM(monthly_profit) OVER (ORDER BY yr ASC, mo ASC)::text AS cumulative_profit
      FROM (
        SELECT
          EXTRACT(YEAR  FROM "dateAdded")::int AS yr,
          EXTRACT(MONTH FROM "dateAdded")::int AS mo,
          SUM(profit)                          AS monthly_profit
        FROM inventory_items
        WHERE "isDeleted" = false
          ${from}
          ${to}
        GROUP BY 1, 2
      ) monthly
      ORDER BY yr ASC, mo ASC
      `,
    );

    return rows.map((r) => ({
      year: r.yr,
      month: r.mo,
      monthlyProfit: Number(r.monthly_profit),
      cumulativeProfit: Number(r.cumulative_profit),
    }));
  }

  // ─── 9. Top Performers ────────────────────────────────────────────────────────

  async getTopPerformers({ dateFrom, dateTo }: DateRangeFilter = {}) {
    const where = this.buildWhere({ dateFrom, dateTo });

    const [byBrand, byModel, byMargin] = await Promise.all([
      // Top brand by total profit
      this.prisma.inventoryItem.groupBy({
        by: ['brand'],
        where,
        _sum: { profit: true },
        _count: { id: true },
        orderBy: { _sum: { profit: 'desc' } },
        take: 1,
      }),

      // Top model by total profit
      this.prisma.inventoryItem.groupBy({
        by: ['brand', 'model'],
        where,
        _sum: { profit: true },
        orderBy: { _sum: { profit: 'desc' } },
        take: 1,
      }),

      // Highest margin brand (avg margin)
      this.prisma.inventoryItem.groupBy({
        by: ['brand'],
        where,
        _avg: { margin: true },
        orderBy: { _avg: { margin: 'desc' } },
        take: 1,
      }),
    ]);

    const topBrandRow = byBrand[0];
    const topModelRow = byModel[0];
    const highestMarginRow = byMargin[0];

    return {
      topBrand: topBrandRow
        ? {
            brand: topBrandRow.brand,
            totalProfit: Number(topBrandRow._sum.profit ?? 0),
            itemCount: topBrandRow._count.id,
          }
        : null,
      topModel: topModelRow
        ? {
            brand: topModelRow.brand,
            model: topModelRow.model,
            totalProfit: Number(topModelRow._sum.profit ?? 0),
          }
        : null,
      highestMarginBrand: highestMarginRow
        ? {
            brand: highestMarginRow.brand,
            avgMargin: Number(highestMarginRow._avg.margin ?? 0),
          }
        : null,
      mostItems: topBrandRow
        ? {
            brand: topBrandRow.brand,
            itemCount: topBrandRow._count.id,
          }
        : null,
    };
  }
}
