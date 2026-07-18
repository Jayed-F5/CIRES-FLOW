import { Test, TestingModule } from '@nestjs/testing';
import { CategorieController } from './categorie.controller';

describe('CategorieController', () => {
  let controller: CategorieController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategorieController],
    }).compile();

    controller = module.get<CategorieController>(CategorieController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
