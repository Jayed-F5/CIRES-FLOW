import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: "L'adresse email doit être valide." })
  email!: string;

  @IsString({ message: 'Le mot de passe est requis.' })
  motDePasse!: string;
}
