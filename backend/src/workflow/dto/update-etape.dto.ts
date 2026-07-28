import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateEtapeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  ordre?: number;

  @IsOptional()
  @IsEnum(Role)
  roleApprobateur?: Role;
}