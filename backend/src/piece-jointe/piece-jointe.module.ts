import { Module } from '@nestjs/common';
import { PieceJointeController } from './piece-jointe.controller';
import { PieceJointeService } from './piece-jointe.service';

@Module({
  controllers: [PieceJointeController],
  providers: [PieceJointeService]
})
export class PieceJointeModule {}
