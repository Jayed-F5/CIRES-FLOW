import { IsString, MinLength } from 'class-validator';

export class CreateDepartementDto {
  @IsString({ message: 'Le nom du département est requis.' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  nom!: string;
}
