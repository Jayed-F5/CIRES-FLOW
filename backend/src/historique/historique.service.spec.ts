import { Test, TestingModule } from '@nestjs/testing';
import { HistoriqueService } from './historique.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HistoriqueService', () => {
  let service: HistoriqueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoriqueService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<HistoriqueService>(HistoriqueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
