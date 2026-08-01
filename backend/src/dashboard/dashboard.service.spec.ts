import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    const prisma = {} as PrismaService;
    service = new DashboardService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
