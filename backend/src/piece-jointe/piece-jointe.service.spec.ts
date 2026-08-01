import { Test, TestingModule } from '@nestjs/testing';
import { PieceJointeService } from './piece-jointe.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistoriqueService } from '../historique/historique.service';

describe('PieceJointeService', () => {
  let service: PieceJointeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PieceJointeService,
        { provide: PrismaService, useValue: {} },
        { provide: HistoriqueService, useValue: {} },
      ],
    }).compile();

    service = module.get<PieceJointeService>(PieceJointeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
