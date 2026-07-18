import { IsEnum } from 'class-validator';
import { StatutDemande } from '@prisma/client';

export class UpdateStatutDto {
  @IsEnum(StatutDemande)
  statut!: StatutDemande;
}