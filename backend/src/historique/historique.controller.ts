import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { HistoriqueService } from './historique.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('demande/:demandeId/historique')
export class HistoriqueController {
  constructor(private historiqueService: HistoriqueService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findByDemande(@Param('demandeId', ParseIntPipe) demandeId: number, @Req() req: any) {
    return this.historiqueService.findByDemande(demandeId, req.user);
  }
}