import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateEtapeDto {
  @IsOptional()
  @IsInt({ message: "L'ordre doit être un nombre entier." })
  @Min(1, { message: "L'ordre doit être supérieur ou égal à 1." })
  ordre?: number;

  @IsOptional()
  @IsEnum(Role, { message: 'Le rôle approbateur sélectionné est invalide.' })
  roleApprobateur?: Role;
}
