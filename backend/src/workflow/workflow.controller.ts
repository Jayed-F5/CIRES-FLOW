import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkflowService } from './workflow.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('workflow')
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('etapes')
  createEtape(@Body() dto: CreateEtapeDto) {
    return this.workflowService.createEtape(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('etapes/categorie/:categorieId')
  findByCategorie(@Param('categorieId', ParseIntPipe) categorieId: number) {
    return this.workflowService.findByCategorie(categorieId);
  }
}