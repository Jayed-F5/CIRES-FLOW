import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateEtapeDto {
  @IsInt()
  @IsPositive()
  categorieId!: number;

  @IsInt()
  @IsPositive()
  ordre!: number;

  @IsEnum(Role)
  roleApprobateur!: Role;
}