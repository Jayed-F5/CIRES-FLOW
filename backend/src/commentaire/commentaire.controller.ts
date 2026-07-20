import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { CommentaireService } from './commentaire.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('demande/:demandeId/commentaires')
export class CommentaireController {
  constructor(private commentaireService: CommentaireService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('demandeId', ParseIntPipe) demandeId: number,
    @Body() dto: CreateCommentaireDto,
    @Req() req: any,
  ) {
    return this.commentaireService.create(demandeId, dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findByDemande(@Param('demandeId', ParseIntPipe) demandeId: number, @Req() req: any) {
    return this.commentaireService.findByDemande(demandeId, req.user);
  }
}