import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInventoryDto {
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
  quantity?: number = 1;

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
