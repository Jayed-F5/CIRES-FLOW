import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;

  beforeEach(() => {
    const notificationService = {} as NotificationService;
    controller = new NotificationController(notificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
