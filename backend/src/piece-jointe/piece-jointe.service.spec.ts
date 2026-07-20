import { Test, TestingModule } from '@nestjs/testing';
import { PieceJointeService } from './piece-jointe.service';

describe('PieceJointeService', () => {
  let service: PieceJointeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PieceJointeService],
    }).compile();

    service = module.get<PieceJointeService>(PieceJointeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
