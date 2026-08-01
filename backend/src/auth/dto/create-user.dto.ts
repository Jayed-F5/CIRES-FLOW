import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString({ message: 'Le nom est requis.' })
  nom!: string;

  @IsString({ message: 'Le prénom est requis.' })
  prenom!: string;

  @IsEmail({}, { message: "L'adresse email doit être valide." })
  email!: string;

  @IsString({ message: 'Le mot de passe est requis.' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  motDePasse!: string;

  @IsEnum(Role, { message: 'Le rôle sélectionné est invalide.' })
  role!: Role;

  @IsOptional()
  @IsInt({ message: 'Le département sélectionné est invalide.' })
  departementId?: number;
}
