import { IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateCategorieDto {
  @IsString({ message: 'Le nom de la catégorie est requis.' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  nom!: string;

  @IsInt({ message: 'Le département est requis.' })
  @IsPositive({ message: 'Le département est requis.' })
  departementId!: number;

  @IsInt({ message: 'Le délai de réponse doit être un nombre entier.' })
  @IsPositive({ message: 'Le délai de réponse doit être un nombre positif.' })
  delaiReponse!: number;

  @IsInt({ message: 'Le délai de résolution doit être un nombre entier.' })
  @IsPositive({ message: 'Le délai de résolution doit être un nombre positif.' })
  delaiResolution!: number;
}
