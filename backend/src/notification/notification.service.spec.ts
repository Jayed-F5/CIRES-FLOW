import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    const prisma = {} as PrismaService;
    const gateway = {} as NotificationGateway;
    service = new NotificationService(prisma, gateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
