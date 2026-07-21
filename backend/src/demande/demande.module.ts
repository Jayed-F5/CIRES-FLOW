import { Module } from '@nestjs/common';
import { DemandeController } from './demande.controller';
import { DemandeService } from './demande.service';
import { HistoriqueModule } from '../historique/historique.module';

@Module({
  imports: [HistoriqueModule],
  controllers: [DemandeController],
  providers: [DemandeService],
})
export class DemandeModule {}