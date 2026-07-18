import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { DemandeService } from './demande.service';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('demande')
export class DemandeController {
  constructor(private demandeService: DemandeService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateDemandeDto, @Req() req: any) {
    return this.demandeService.create(dto, req.user.userId);
  }
}