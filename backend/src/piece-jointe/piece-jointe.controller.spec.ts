import { Test, TestingModule } from '@nestjs/testing';
import { PieceJointeController } from './piece-jointe.controller';

describe('PieceJointeController', () => {
  let controller: PieceJointeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PieceJointeController],
    }).compile();

    controller = module.get<PieceJointeController>(PieceJointeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
