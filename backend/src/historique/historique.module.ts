import { Module } from '@nestjs/common';
import { HistoriqueController } from './historique.controller';
import { HistoriqueService } from './historique.service';

@Module({
  controllers: [HistoriqueController],
  providers: [HistoriqueService],
  exports: [HistoriqueService],
})
export class HistoriqueModule {}
