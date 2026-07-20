import { IsEnum, IsString, MinLength } from 'class-validator';
import { VisibiliteCommentaire } from '@prisma/client';

export class CreateCommentaireDto {
  @IsString()
  @MinLength(1)
  contenu!: string;

  @IsEnum(VisibiliteCommentaire)
  visibilite!: VisibiliteCommentaire;
}