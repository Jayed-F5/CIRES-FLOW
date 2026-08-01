import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Priorite, StatutDemande } from '@prisma/client';

export class QueryDemandeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le numéro de page doit être un nombre entier.' })
  @Min(1, { message: 'Le numéro de page doit être supérieur ou égal à 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite doit être un nombre entier.' })
  @Min(1, { message: 'La limite doit être supérieure ou égale à 1.' })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le département doit être un identifiant valide.' })
  @IsPositive({ message: 'Le département doit être un identifiant valide.' })
  departementId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La catégorie doit être un identifiant valide.' })
  @IsPositive({ message: 'La catégorie doit être un identifiant valide.' })
  categorieId?: number;

  @IsOptional()
  @IsEnum(StatutDemande, { message: 'Le statut fourni est invalide.' })
  statut?: StatutDemande;

  @IsOptional()
  @IsEnum(Priorite, { message: 'La priorité fournie est invalide.' })
  priorite?: Priorite;

  @IsOptional()
  @IsString({ message: 'Le terme de recherche doit être une chaîne de caractères.' })
  search?: string;
}
