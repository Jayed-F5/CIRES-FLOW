import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { APPROBATEUR_ROLES } from './approbateur-roles';

export class UpdateEtapeDto {
  @IsOptional()
  @IsInt({ message: "L'ordre doit être un nombre entier." })
  @Min(1, { message: "L'ordre doit être supérieur ou égal à 1." })
  ordre?: number;

  @IsOptional()
  @IsIn(APPROBATEUR_ROLES, {
    message: 'Le rôle approbateur doit être Agent ou Manager.',
  })
  roleApprobateur?: Role;
}
