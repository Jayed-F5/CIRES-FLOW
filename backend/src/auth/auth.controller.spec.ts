import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    const authService = {} as AuthService;
    controller = new AuthController(authService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
