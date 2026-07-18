import { IsEnum, IsInt, IsObject, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { Priorite } from '@prisma/client';

export class CreateDemandeDto {
  @IsString()
  @MinLength(3)
  titre!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsEnum(Priorite)
  priorite!: Priorite;

  @IsInt()
  @IsPositive()
  departementId!: number;

  @IsInt()
  @IsPositive()
  categorieId!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}