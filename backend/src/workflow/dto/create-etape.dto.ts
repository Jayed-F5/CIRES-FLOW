import { IsIn, IsInt, IsPositive } from 'class-validator';
import { Role } from '@prisma/client';
import { APPROBATEUR_ROLES } from './approbateur-roles';

export class CreateEtapeDto {
  @IsInt({ message: 'La catégorie est requise.' })
  @IsPositive({ message: 'La catégorie est requise.' })
  categorieId!: number;

  @IsInt({ message: "L'ordre doit être un nombre entier." })
  @IsPositive({ message: "L'ordre doit être un nombre positif." })
  ordre!: number;

  @IsIn(APPROBATEUR_ROLES, {
    message: 'Le rôle approbateur doit être Agent ou Manager.',
  })
  roleApprobateur!: Role;
}
