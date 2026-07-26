import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkflowService } from './workflow.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { DecideApprobationDto } from './dto/decide-approbation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('workflow/etapes')
  createEtape(@Body() dto: CreateEtapeDto) {
    return this.workflowService.createEtape(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('workflow/etapes/categorie/:categorieId')
  findByCategorie(@Param('categorieId', ParseIntPipe) categorieId: number) {
    return this.workflowService.findByCategorie(categorieId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('approbations/:id')
  decideApprobation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideApprobationDto,
    @Req() req: any,
  ) {
    return this.workflowService.decideApprobation(id, dto, req.user);
  }
  @UseGuards(JwtAuthGuard)
  @Get('demande/:demandeId/approbations')
  findByDemande(@Param('demandeId', ParseIntPipe) demandeId: number) {
    return this.workflowService.findByDemande(demandeId);
  }
}