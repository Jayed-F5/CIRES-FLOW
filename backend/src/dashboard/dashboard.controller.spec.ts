import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(() => {
    const dashboardService = {} as DashboardService;
    controller = new DashboardController(dashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
