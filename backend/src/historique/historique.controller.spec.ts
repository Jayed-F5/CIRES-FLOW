import { Test, TestingModule } from '@nestjs/testing';
import { HistoriqueController } from './historique.controller';

describe('HistoriqueController', () => {
  let controller: HistoriqueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoriqueController],
    }).compile();

    controller = module.get<HistoriqueController>(HistoriqueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
