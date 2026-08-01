import { DepartementController } from './departement.controller';
import { DepartementService } from './departement.service';

describe('DepartementController', () => {
  let controller: DepartementController;

  beforeEach(() => {
    const departementService = {} as DepartementService;
    controller = new DepartementController(departementService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
