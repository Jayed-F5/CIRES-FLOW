import { Module } from '@nestjs/common';
import { CommentaireController } from './commentaire.controller';
import { CommentaireService } from './commentaire.service';
import { HistoriqueModule } from '../historique/historique.module';

@Module({
  imports: [HistoriqueModule],
  controllers: [CommentaireController],
  providers: [CommentaireService],
})
export class CommentaireModule {}