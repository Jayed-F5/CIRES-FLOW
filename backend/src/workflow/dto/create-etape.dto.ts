import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateEtapeDto {
  @IsInt({ message: 'La catégorie est requise.' })
  @IsPositive({ message: 'La catégorie est requise.' })
  categorieId!: number;

  @IsInt({ message: "L'ordre doit être un nombre entier." })
  @IsPositive({ message: "L'ordre doit être un nombre positif." })
  ordre!: number;

  @IsEnum(Role, { message: 'Le rôle approbateur sélectionné est invalide.' })
  roleApprobateur!: Role;
}
