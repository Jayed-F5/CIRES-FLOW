import { IsEnum, IsString, MinLength } from 'class-validator';
import { VisibiliteCommentaire } from '@prisma/client';

export class CreateCommentaireDto {
  @IsString({ message: 'Le commentaire est requis.' })
  @MinLength(1, { message: 'Le commentaire ne peut pas être vide.' })
  contenu!: string;

  @IsEnum(VisibiliteCommentaire, { message: 'La visibilité sélectionnée est invalide.' })
  visibilite!: VisibiliteCommentaire;
}
