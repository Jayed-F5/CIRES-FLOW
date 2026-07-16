import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  nom!: string;

  @IsString()
  prenom!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  motDePasse!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsInt()
  departementId?: number;
}