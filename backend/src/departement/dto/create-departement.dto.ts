import { IsString, MinLength } from 'class-validator';

export class CreateDepartementDto {
  @IsString()
  @MinLength(2)
  nom!: string;
}