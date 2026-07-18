import { Module } from '@nestjs/common';
import { DepartementController } from './departement.controller';
import { DepartementService } from './departement.service';

@Module({
  controllers: [DepartementController],
  providers: [DepartementService]
})
export class DepartementModule {}
