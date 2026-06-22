import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OcrModule } from '../ocr/ocr.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [PrismaModule, OcrModule, InventoryModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
