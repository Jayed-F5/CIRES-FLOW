import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { StatutDemande } from '@prisma/client';

export class DashboardFilterDto {
  @IsOptional()
  @IsDateString({}, { message: 'La date de début doit être une date valide.' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin doit être une date valide.' })
  dateTo?: string;

  @IsOptional()
  @IsEnum(StatutDemande, { message: 'Le statut fourni est invalide.' })
  statut?: StatutDemande;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La catégorie doit être un identifiant valide.' })
  @IsPositive({ message: 'La catégorie doit être un identifiant valide.' })
  categorieId?: number;
}
