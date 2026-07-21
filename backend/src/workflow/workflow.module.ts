import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { HistoriqueModule } from '../historique/historique.module';

@Module({
  imports: [HistoriqueModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}