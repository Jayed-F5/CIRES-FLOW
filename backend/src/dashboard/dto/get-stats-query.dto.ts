import { IsOptional, IsNumberString } from 'class-validator';

export class GetStatsQueryDto {
  @IsOptional()
  @IsNumberString()
  departementId?: string;
}