import { CategorieController } from './categorie.controller';
import { CategorieService } from './categorie.service';

describe('CategorieController', () => {
  let controller: CategorieController;

  beforeEach(() => {
    const categorieService = {} as CategorieService;
    controller = new CategorieController(categorieService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
