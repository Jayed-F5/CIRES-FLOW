import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(Role, { message: 'Le rôle sélectionné est invalide.' })
  role?: Role;

  @IsOptional()
  @IsInt({ message: 'Le département sélectionné est invalide.' })
  departementId?: number;
}
