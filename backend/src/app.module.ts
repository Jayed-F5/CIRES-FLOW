import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FrenchThrottlerGuard } from './common/guards/french-throttler.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
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
    NotificationModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: FrenchThrottlerGuard,
    },
  ],
})
export class AppModule {}