import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    notification: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      notification: { findMany: jest.fn(), count: jest.fn() },
    };
    const gateway = {} as NotificationGateway;
    service = new NotificationService(
      prisma as unknown as PrismaService,
      gateway,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMine', () => {
    it('pagine avec les valeurs par défaut (page 1, 20 par page)', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findMine(1);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { utilisateurId: 1 },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('plafonne la taille de page à 50 même si on demande plus', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findMine(1, 1, 500);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('calcule skip/totalPages à partir de page et limit', async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: 21 }]);
      prisma.notification.count.mockResolvedValue(45);

      const result = await service.findMine(1, 2, 20);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
      expect(result).toEqual({
        data: [{ id: 21 }],
        total: 45,
        page: 2,
        totalPages: 3,
      });
    });
  });
});