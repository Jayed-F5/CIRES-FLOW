import { Module } from '@nestjs/common';
import { CategorieController } from './categorie.controller';
import { CategorieService } from './categorie.service';

@Module({
  controllers: [CategorieController],
  providers: [CategorieService]
})
export class CategorieModule {}
