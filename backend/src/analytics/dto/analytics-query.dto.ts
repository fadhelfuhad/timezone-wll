import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for every analytics endpoint. Both bounds are optional but,
 * when present, must be valid ISO 8601 date strings. This rejects malformed or
 * malicious values with a 400 before they ever reach the database layer —
 * defense in depth on top of the parameterized raw queries in the service.
 */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date (ISO 8601) — inclusive lower bound for dateAdded',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601) — inclusive upper bound for dateAdded',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
