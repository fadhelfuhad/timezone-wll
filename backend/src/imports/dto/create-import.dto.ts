import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConflictResolution, FileType, RowStatus } from '@prisma/client';

export class CreateImportDto {
  @IsString()
  filename!: string;

  @IsEnum(FileType)
  fileType!: FileType;

  @IsString()
  @IsOptional()
  note?: string;
}

export class ApproveRowItemDto {
  @IsString()
  rowId!: string;

  @IsObject()
  @IsOptional()
  parsedData?: Record<string, unknown>;
}

export class ApproveImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveRowItemDto)
  rows!: ApproveRowItemDto[];
}

export class UpdateImportRowDto {
  @IsObject()
  @IsOptional()
  parsedData?: Record<string, unknown>;

  @IsEnum(RowStatus)
  @IsOptional()
  status?: RowStatus;
}

export class RowResolutionDto {
  @IsString()
  rowId!: string;

  @IsEnum(ConflictResolution)
  resolution!: ConflictResolution;

  @IsObject()
  @IsOptional()
  resolvedData?: Record<string, unknown>;
}

export class ResolveConflictsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RowResolutionDto)
  resolutions!: RowResolutionDto[];
}
