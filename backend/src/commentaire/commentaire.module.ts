import { Module } from '@nestjs/common';
import { CommentaireController } from './commentaire.controller';
import { CommentaireService } from './commentaire.service';

@Module({
  controllers: [CommentaireController],
  providers: [CommentaireService]
})
export class CommentaireModule {}
