import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatutApprobation } from '@prisma/client';

export class DecideApprobationDto {
  @IsEnum(StatutApprobation)
  statut!: StatutApprobation;

  @IsOptional()
  @IsString()
  commentaire?: string;
}