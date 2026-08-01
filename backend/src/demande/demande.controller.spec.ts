import { DemandeController } from './demande.controller';
import { DemandeService } from './demande.service';

describe('DemandeController', () => {
  let controller: DemandeController;

  beforeEach(() => {
    const demandeService = {} as DemandeService;
    controller = new DemandeController(demandeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
