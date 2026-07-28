import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  ancienMotDePasse!: string;

  @IsString()
  @MinLength(6)
  nouveauMotDePasse!: string;
}