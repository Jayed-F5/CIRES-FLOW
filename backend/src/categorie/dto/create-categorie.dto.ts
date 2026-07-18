import { IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  @MinLength(2)
  nom!: string;

  @IsInt()
  @IsPositive()
  departementId!: number;

  @IsInt()
  @IsPositive()
  delaiReponse!: number;

  @IsInt()
  @IsPositive()
  delaiResolution!: number;
}