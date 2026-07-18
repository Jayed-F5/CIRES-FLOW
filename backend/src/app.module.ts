import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DepartementModule } from './departement/departement.module';
import { CategorieModule } from './categorie/categorie.module';

@Module({
  imports: [ PrismaModule, AuthModule, DepartementModule, CategorieModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
