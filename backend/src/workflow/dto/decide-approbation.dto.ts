import { IsIn, IsOptional, IsString } from 'class-validator';
import { StatutApprobation } from '@prisma/client';

export class DecideApprobationDto {
  @IsIn([StatutApprobation.APPROUVE, StatutApprobation.REJETE], {
    message: 'La décision doit être APPROUVE ou REJETE.',
  })
  statut!: StatutApprobation;

  @IsOptional()
  @IsString({ message: 'Le commentaire doit être une chaîne de caractères.' })
  commentaire?: string;
}
