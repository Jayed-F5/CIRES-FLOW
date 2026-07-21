import { Module } from '@nestjs/common';
import { PieceJointeController } from './piece-jointe.controller';
import { PieceJointeService } from './piece-jointe.service';
import { HistoriqueModule } from '../historique/historique.module';

@Module({
  imports: [HistoriqueModule],
  controllers: [PieceJointeController],
  providers: [PieceJointeService],
})
export class PieceJointeModule {}