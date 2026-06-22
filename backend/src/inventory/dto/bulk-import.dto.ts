import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkImportItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsDateString()
  @IsOptional()
  dateAdded?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportItemDto)
  items: BulkImportItemDto[];

  @IsString()
  @IsOptional()
  importId?: string;
}
