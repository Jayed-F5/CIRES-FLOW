import { Module } from '@nestjs/common';
import { DemandeController } from './demande.controller';
import { DemandeService } from './demande.service';

@Module({
  controllers: [DemandeController],
  providers: [DemandeService]
})
export class DemandeModule {}
