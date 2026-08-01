import { IsBoolean } from 'class-validator';

export class UpdateStatutUserDto {
  @IsBoolean({ message: 'Le statut actif doit être vrai ou faux.' })
  actif!: boolean;
}
