import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─── Shared query decorators ──────────────────────────────────────────────────

  private static readonly dateFromQuery = ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date (ISO 8601) — inclusive lower bound for dateAdded',
    example: '2024-01-01T00:00:00.000Z',
  });

  private static readonly dateToQuery = ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date (ISO 8601) — inclusive upper bound for dateAdded',
    example: '2024-12-31T23:59:59.999Z',
  });

  // ─── Routes ───────────────────────────────────────────────────────────────────

  @Get('profit-summary')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Profit summary',
    description:
      'Returns aggregated totals: profit, cost, sale, average margin, item count, and quantity.',
  })
  @ApiResponse({ status: 200, description: 'Profit summary returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfitSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProfitSummary({ dateFrom, dateTo });
  }

  @Get('profit-by-day')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Profit grouped by day',
    description: 'Returns daily profit, cost, and sale totals sorted chronologically.',
  })
  @ApiResponse({ status: 200, description: 'Daily profit data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfitByDay(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProfitByDay({ dateFrom, dateTo });
  }

  @Get('profit-by-month')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Profit grouped by month',
    description: 'Returns monthly profit, cost, and sale totals sorted chronologically.',
  })
  @ApiResponse({ status: 200, description: 'Monthly profit data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfitByMonth(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProfitByMonth({ dateFrom, dateTo });
  }

  @Get('profit-by-year')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Profit grouped by year',
    description: 'Returns yearly profit, cost, and sale totals sorted chronologically.',
  })
  @ApiResponse({ status: 200, description: 'Yearly profit data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfitByYear(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProfitByYear({ dateFrom, dateTo });
  }

  @Get('profit-by-brand')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Profit grouped by brand (top 10)',
    description:
      'Returns the top 10 brands ranked by total profit, including cost, sale, item count, and average margin.',
  })
  @ApiResponse({ status: 200, description: 'Brand profit data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfitByBrand(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProfitByBrand({ dateFrom, dateTo });
  }

  @Get('profit-by-product')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Profit grouped by brand + model (top 20)',
    description:
      'Returns the top 20 brand/model combinations ranked by total profit.',
  })
  @ApiResponse({ status: 200, description: 'Product profit data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfitByProduct(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProfitByProduct({ dateFrom, dateTo });
  }

  @Get('cost-vs-sale')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Cost vs sale by month',
    description:
      'Returns monthly cost, sale, and profit totals — useful for bar/line chart comparisons.',
  })
  @ApiResponse({ status: 200, description: 'Cost vs sale data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCostVsSaleByMonth(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getCostVsSaleByMonth({ dateFrom, dateTo });
  }

  @Get('inventory-by-brand')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Inventory sale value by brand (pie chart)',
    description:
      'Returns each brand\'s total sale value and its percentage share of the overall total.',
  })
  @ApiResponse({ status: 200, description: 'Inventory brand data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getInventoryByBrand(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getInventoryByBrand({ dateFrom, dateTo });
  }

  @Get('profit-growth')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Profit growth — cumulative running total',
    description:
      'Returns monthly profit alongside a cumulative running total, enabling growth trend charts.',
  })
  @ApiResponse({ status: 200, description: 'Profit growth data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfitGrowth(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProfitGrowth({ dateFrom, dateTo });
  }

  @Get('top-performers')
  @AnalyticsController.dateFromQuery
  @AnalyticsController.dateToQuery
  @ApiOperation({
    summary: 'Top performers',
    description:
      'Returns the top brand by profit, top model by profit, highest-margin brand, and the brand with the most items.',
  })
  @ApiResponse({ status: 200, description: 'Top performers returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTopPerformers(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getTopPerformers({ dateFrom, dateTo });
  }
}
