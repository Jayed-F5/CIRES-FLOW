import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Priorite, StatutDemande } from '@prisma/client';

export class QueryDemandeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  departementId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categorieId?: number;

  @IsOptional()
  @IsEnum(StatutDemande)
  statut?: StatutDemande;

  @IsOptional()
  @IsEnum(Priorite)
  priorite?: Priorite;

  @IsOptional()
  @IsString()
  search?: string;
}