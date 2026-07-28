import { IsBoolean } from 'class-validator';

export class UpdateStatutUserDto {
  @IsBoolean()
  actif!: boolean;
}