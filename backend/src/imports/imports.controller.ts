import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ImportMode, Role, User } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { ImportsService } from './imports.service';
import {
  ApproveImportDto,
  ResolveConflictsDto,
  UpdateImportRowDto,
} from './dto/create-import.dto';

// Resolve the upload directory from env, falling back to the OS temp dir.
// On a read-only serverless filesystem (e.g. Vercel) only the temp dir is
// writable, so default there rather than to ./uploads which cannot be created.
const UPLOAD_DIR = process.env['UPLOAD_DIR']
  ? path.resolve(process.env['UPLOAD_DIR'])
  : path.join(os.tmpdir(), 'timezone-uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Directory creation can fail on a read-only FS; Multer will surface a clear
  // error at upload time rather than crashing the whole app at import.
}

const UPLOAD_STORAGE = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
]);

@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  // ─── Upload file ──────────────────────────────────────────────────────────

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: UPLOAD_STORAGE }))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
    @Query('mode') mode?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed types: image, PDF, Excel, CSV`,
      );
    }

    const importMode = mode?.toUpperCase() === 'REPLACE' ? 'REPLACE' : 'APPEND';

    return this.importsService.create(file, user.id, user.role as Role, importMode as ImportMode);
  }

  // ─── List imports (admin sees all, staff sees own) ────────────────────────

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.importsService.findAll(user.id, user.role as Role);
  }

  // ─── Get single import with rows ──────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.importsService.findOne(id, user.id, user.role as Role);
  }

  // ─── Update a specific row ────────────────────────────────────────────────

  @Patch(':id/rows/:rowId')
  updateRow(
    @Param('id', ParseUUIDPipe) importId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() dto: UpdateImportRowDto,
    @CurrentUser() user: User,
  ) {
    return this.importsService.updateRow(importId, rowId, dto, user.id, user.role as Role);
  }

  // ─── Resolve conflicts ────────────────────────────────────────────────────

  @Post(':id/resolve')
  resolveConflicts(
    @Param('id', ParseUUIDPipe) importId: string,
    @Body() dto: ResolveConflictsDto,
    @CurrentUser() user: User,
  ) {
    return this.importsService.resolveConflicts(importId, dto, user.id, user.role as Role);
  }

  // ─── Approve import ───────────────────────────────────────────────────────

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) importId: string,
    @Body() dto: ApproveImportDto,
    @CurrentUser() user: User,
  ) {
    return this.importsService.approve(importId, dto, user.id, user.role as Role);
  }

  // ─── Cancel import ────────────────────────────────────────────────────────

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) importId: string,
    @CurrentUser() user: User,
  ) {
    return this.importsService.cancel(importId, user.id, user.role as Role);
  }
}
