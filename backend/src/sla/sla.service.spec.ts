import { SlaService } from './sla.service';

function createMockPrisma() {
  return {
    demande: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createMockNotification() {
  return { notify: jest.fn() };
}

function baseDemande(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    titre: 'Test',
    demandeurId: 10,
    dateLimiteSLA: null,
    dateLimiteReponse: null,
    dateReponse: null,
    alerteDepasseEnvoyee: false,
    alerteRisqueEnvoyee: false,
    alerteReponseDepasseEnvoyee: false,
    alerteReponseRisqueEnvoyee: false,
    ...overrides,
  };
}

describe('SlaService', () => {
  let service: SlaService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let notificationService: ReturnType<typeof createMockNotification>;

  beforeEach(() => {
    prisma = createMockPrisma();
    notificationService = createMockNotification();
    service = new SlaService(prisma as any, notificationService as any);
  });

  it('notifie et marque le flag quand le délai de résolution est dépassé', async () => {
    const demande = baseDemande({ dateLimiteSLA: new Date(Date.now() - 1000) });
    prisma.demande.findMany.mockResolvedValue([demande]);

    await service.checkSlaDeadlines();

    expect(notificationService.notify).toHaveBeenCalledWith(
      demande.demandeurId,
      expect.stringContaining('dépassé'),
      expect.any(String),
    );
    expect(prisma.demande.update).toHaveBeenCalledWith({
      where: { id: demande.id },
      data: { alerteDepasseEnvoyee: true },
    });
  });

  it('ne notifie pas deux fois pour un dépassement déjà signalé', async () => {
    const demande = baseDemande({
      dateLimiteSLA: new Date(Date.now() - 1000),
      alerteDepasseEnvoyee: true,
    });
    prisma.demande.findMany.mockResolvedValue([demande]);

    await service.checkSlaDeadlines();

    expect(notificationService.notify).not.toHaveBeenCalled();
    expect(prisma.demande.update).not.toHaveBeenCalled();
  });

  it("notifie 'à risque' quand la limite de résolution approche (< 1h)", async () => {
    const demande = baseDemande({ dateLimiteSLA: new Date(Date.now() + 30 * 60 * 1000) });
    prisma.demande.findMany.mockResolvedValue([demande]);

    await service.checkSlaDeadlines();

    expect(notificationService.notify).toHaveBeenCalledWith(
      demande.demandeurId,
      expect.stringContaining('résolution'),
      expect.any(String),
    );
    expect(prisma.demande.update).toHaveBeenCalledWith({
      where: { id: demande.id },
      data: { alerteRisqueEnvoyee: true },
    });
  });

  it("ne notifie pas si la limite de résolution est loin", async () => {
    const demande = baseDemande({ dateLimiteSLA: new Date(Date.now() + 10 * 60 * 60 * 1000) });
    prisma.demande.findMany.mockResolvedValue([demande]);

    await service.checkSlaDeadlines();

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('gère le délai de réponse indépendamment du délai de résolution', async () => {
    const demande = baseDemande({
      dateLimiteReponse: new Date(Date.now() - 1000),
      dateReponse: null,
    });
    prisma.demande.findMany.mockResolvedValue([demande]);

    await service.checkSlaDeadlines();

    expect(notificationService.notify).toHaveBeenCalledWith(
      demande.demandeurId,
      expect.stringContaining('réponse'),
      expect.any(String),
    );
    expect(prisma.demande.update).toHaveBeenCalledWith({
      where: { id: demande.id },
      data: { alerteReponseDepasseEnvoyee: true },
    });
  });

  it("n'alerte pas sur le délai de réponse si une réponse a déjà été apportée", async () => {
    const demande = baseDemande({
      dateLimiteReponse: new Date(Date.now() - 1000),
      dateReponse: new Date(),
    });
    prisma.demande.findMany.mockResolvedValue([demande]);

    await service.checkSlaDeadlines();

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('exclut les demandes fermées de la requête', async () => {
    prisma.demande.findMany.mockResolvedValue([]);

    await service.checkSlaDeadlines();

    expect(prisma.demande.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          statut: expect.objectContaining({ notIn: expect.any(Array) }),
        }),
      }),
    );
  });
});
