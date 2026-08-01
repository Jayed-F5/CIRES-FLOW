import { IsEnum, IsInt, IsObject, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { Priorite } from '@prisma/client';

export class CreateDemandeDto {
  @IsString({ message: 'Le titre est requis.' })
  @MinLength(3, { message: 'Le titre doit contenir au moins 3 caractères.' })
  titre!: string;

  @IsString({ message: 'La description est requise.' })
  @MinLength(10, { message: 'La description doit contenir au moins 10 caractères.' })
  description!: string;

  @IsEnum(Priorite, { message: 'La priorité sélectionnée est invalide.' })
  priorite!: Priorite;

  @IsInt({ message: 'Le département est requis.' })
  @IsPositive({ message: 'Le département est requis.' })
  departementId!: number;

  @IsInt({ message: 'La catégorie est requise.' })
  @IsPositive({ message: 'La catégorie est requise.' })
  categorieId!: number;

  @IsOptional()
  @IsObject({ message: 'Les métadonnées doivent être un objet valide.' })
  metadata?: Record<string, any>;
}
