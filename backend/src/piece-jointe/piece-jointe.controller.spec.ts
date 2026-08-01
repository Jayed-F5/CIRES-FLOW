import { Test, TestingModule } from '@nestjs/testing';
import { PieceJointeController } from './piece-jointe.controller';
import { PieceJointeService } from './piece-jointe.service';

describe('PieceJointeController', () => {
  let controller: PieceJointeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PieceJointeController],
      providers: [{ provide: PieceJointeService, useValue: {} }],
    }).compile();

    controller = module.get<PieceJointeController>(PieceJointeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
