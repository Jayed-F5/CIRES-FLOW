import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DepartementModule } from './departement/departement.module';
import { CategorieModule } from './categorie/categorie.module';
import { DemandeModule } from './demande/demande.module';
import { WorkflowModule } from './workflow/workflow.module';
import { SlaModule } from './sla/sla.module';
import { CommentaireModule } from './commentaire/commentaire.module';
import { PieceJointeModule } from './piece-jointe/piece-jointe.module';
import { HistoriqueModule } from './historique/historique.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    DepartementModule,
    CategorieModule,
    DemandeModule,
    WorkflowModule,
    SlaModule,
    CommentaireModule,
    PieceJointeModule,
    HistoriqueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}