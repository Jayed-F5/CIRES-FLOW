import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, StatutDemande } from '@prisma/client';
import { DemandeService, calculerIndicateurSLA } from './demande.service';

function createMockPrisma() {
  const tx = {
    demande: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    approbation: { create: jest.fn() },
    historiqueAction: { create: jest.fn() },
  };

  return {
    departement: { findUnique: jest.fn() },
    categorie: { findUnique: jest.fn() },
    workflowEtape: { findFirst: jest.fn() },
    demande: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (txArg: typeof tx) => unknown) => callback(tx)),
    __tx: tx,
  };
}

function createMockNotification() {
  return { notify: jest.fn(), notifyByRole: jest.fn() };
}

describe('calculerIndicateurSLA', () => {
  it('retourne NON_APPLICABLE si pas de date limite', () => {
    expect(calculerIndicateurSLA({ statut: StatutDemande.EN_COURS, dateLimiteSLA: null })).toBe(
      'NON_APPLICABLE',
    );
  });

  it('retourne NON_APPLICABLE si la demande est fermée', () => {
    const dateLimiteSLA = new Date(Date.now() - 1000);
    expect(calculerIndicateurSLA({ statut: StatutDemande.CLOTURE, dateLimiteSLA })).toBe(
      'NON_APPLICABLE',
    );
    expect(calculerIndicateurSLA({ statut: StatutDemande.REJETE, dateLimiteSLA })).toBe(
      'NON_APPLICABLE',
    );
    expect(calculerIndicateurSLA({ statut: StatutDemande.ANNULE, dateLimiteSLA })).toBe(
      'NON_APPLICABLE',
    );
  });

  it('retourne DEPASSE si la date limite est passée', () => {
    const dateLimiteSLA = new Date(Date.now() - 1000);
    expect(calculerIndicateurSLA({ statut: StatutDemande.EN_COURS, dateLimiteSLA })).toBe(
      'DEPASSE',
    );
  });

  it("retourne A_RISQUE si la date limite est dans moins d'1h", () => {
    const dateLimiteSLA = new Date(Date.now() + 30 * 60 * 1000);
    expect(calculerIndicateurSLA({ statut: StatutDemande.EN_COURS, dateLimiteSLA })).toBe(
      'A_RISQUE',
    );
  });

  it('retourne RESPECTE si la date limite est loin', () => {
    const dateLimiteSLA = new Date(Date.now() + 10 * 60 * 60 * 1000);
    expect(calculerIndicateurSLA({ statut: StatutDemande.EN_COURS, dateLimiteSLA })).toBe(
      'RESPECTE',
    );
  });
});

describe('DemandeService', () => {
  let service: DemandeService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let notificationService: ReturnType<typeof createMockNotification>;

  const employe = { userId: 1, role: Role.EMPLOYE, departementId: null };
  const agent = { userId: 2, role: Role.AGENT, departementId: 10 };
  const admin = { userId: 3, role: Role.ADMIN, departementId: null };

  beforeEach(() => {
    prisma = createMockPrisma();
    notificationService = createMockNotification();
    service = new DemandeService(prisma as any, notificationService as any);
  });

  describe('findAll — scoping by role', () => {
    beforeEach(() => {
      prisma.demande.findMany.mockResolvedValue([]);
      prisma.demande.count.mockResolvedValue(0);
    });

    it('scope un EMPLOYE à ses propres demandes', async () => {
      await service.findAll({} as any, employe);
      expect(prisma.demande.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ demandeurId: employe.userId }) }),
      );
    });

    it('scope un AGENT à son département', async () => {
      await service.findAll({} as any, agent);
      expect(prisma.demande.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ departementId: agent.departementId }),
        }),
      );
    });

    it('scope un AGENT sans département à un filtre impossible (-1)', async () => {
      await service.findAll({} as any, { ...agent, departementId: null });
      expect(prisma.demande.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ departementId: -1 }) }),
      );
    });

    it('ne restreint pas un ADMIN', async () => {
      await service.findAll({} as any, admin);
      const call = prisma.demande.findMany.mock.calls[0][0];
      expect(call.where.demandeurId).toBeUndefined();
      expect(call.where.departementId).toBeUndefined();
    });
  });

  describe("findOne — contrôle d'accès", () => {
    const demandeBase = {
      id: 5,
      demandeurId: employe.userId,
      departementId: agent.departementId,
      statut: StatutDemande.EN_COURS,
      dateLimiteSLA: null,
    };

    it("lève NotFoundException si la demande n'existe pas", async () => {
      prisma.demande.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999, admin)).rejects.toThrow(NotFoundException);
    });

    it("un EMPLOYE ne peut pas voir la demande d'un autre", async () => {
      prisma.demande.findUnique.mockResolvedValue(demandeBase);
      await expect(service.findOne(5, { ...employe, userId: 999 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("un AGENT hors département ne peut pas voir la demande", async () => {
      prisma.demande.findUnique.mockResolvedValue(demandeBase);
      await expect(service.findOne(5, { ...agent, departementId: 999 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('un ADMIN peut toujours voir la demande', async () => {
      prisma.demande.findUnique.mockResolvedValue(demandeBase);
      const result = await service.findOne(5, admin);
      expect(result.id).toBe(5);
    });
  });

  describe('updateStatut — matrice de transitions', () => {
    function mockFindOne(demande: any) {
      prisma.demande.findUnique.mockResolvedValue(demande);
    }

    it('rejette une transition invalide', async () => {
      mockFindOne({
        id: 1,
        statut: StatutDemande.CLOTURE,
        demandeurId: employe.userId,
        departementId: 10,
        dateLimiteSLA: null,
      });
      await expect(
        service.updateStatut(1, { statut: StatutDemande.EN_COURS } as any, employe),
      ).rejects.toThrow(BadRequestException);
    });

    it("interdit à un EMPLOYE d'annuler la demande d'un autre", async () => {
      mockFindOne({
        id: 1,
        statut: StatutDemande.NOUVEAU,
        demandeurId: 999,
        departementId: 10,
        dateLimiteSLA: null,
      });
      await expect(
        service.updateStatut(1, { statut: StatutDemande.ANNULE } as any, employe),
      ).rejects.toThrow(ForbiddenException);
    });

    it("permet au demandeur d'annuler sa propre demande", async () => {
      mockFindOne({
        id: 1,
        statut: StatutDemande.NOUVEAU,
        demandeurId: employe.userId,
        departementId: 10,
        dateLimiteSLA: null,
        titre: 'Test',
      });
      prisma.__tx.demande.updateMany.mockResolvedValue({ count: 1 });
      prisma.__tx.demande.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        statut: StatutDemande.ANNULE,
        demandeurId: employe.userId,
        departementId: 10,
        dateLimiteSLA: null,
        titre: 'Test',
      });

      const result = await service.updateStatut(1, { statut: StatutDemande.ANNULE } as any, employe);
      expect(result.statut).toBe(StatutDemande.ANNULE);
    });

    it('interdit à un EMPLOYE de faire progresser vers RESOLU', async () => {
      mockFindOne({
        id: 1,
        statut: StatutDemande.EN_COURS,
        demandeurId: employe.userId,
        departementId: 10,
        dateLimiteSLA: null,
      });
      await expect(
        service.updateStatut(1, { statut: StatutDemande.RESOLU } as any, employe),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permet à un AGENT de faire progresser vers RESOLU', async () => {
      mockFindOne({
        id: 1,
        statut: StatutDemande.EN_COURS,
        demandeurId: employe.userId,
        departementId: agent.departementId,
        dateLimiteSLA: null,
        titre: 'Test',
      });
      prisma.__tx.demande.updateMany.mockResolvedValue({ count: 1 });
      prisma.__tx.demande.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        statut: StatutDemande.RESOLU,
        demandeurId: employe.userId,
        departementId: agent.departementId,
        dateLimiteSLA: null,
        titre: 'Test',
      });

      const result = await service.updateStatut(1, { statut: StatutDemande.RESOLU } as any, agent);
      expect(result.statut).toBe(StatutDemande.RESOLU);
    });

    it('lève une erreur si la demande a été modifiée entretemps (concurrence)', async () => {
      mockFindOne({
        id: 1,
        statut: StatutDemande.EN_COURS,
        demandeurId: employe.userId,
        departementId: agent.departementId,
        dateLimiteSLA: null,
        titre: 'Test',
      });
      // Simule une requête concurrente qui a déjà changé le statut.
      prisma.__tx.demande.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateStatut(1, { statut: StatutDemande.RESOLU } as any, agent),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create — atomicité', () => {
    it('crée une demande et sa première approbation dans la même transaction', async () => {
      prisma.departement.findUnique.mockResolvedValue({ id: 1, nom: 'IT' });
      prisma.categorie.findUnique.mockResolvedValue({
        id: 2,
        nom: 'Bug',
        departementId: 1,
        delaiReponse: 4,
        delaiResolution: 24,
      });
      prisma.workflowEtape.findFirst.mockResolvedValue({
        id: 7,
        categorieId: 2,
        ordre: 1,
        roleApprobateur: Role.MANAGER,
      });
      const created = {
        id: 100,
        titre: 'T',
        statut: StatutDemande.EN_ATTENTE_APPROBATION,
        departementId: 1,
        dateLimiteSLA: null,
      };
      prisma.__tx.demande.create.mockResolvedValue(created);

      const dto = {
        titre: 'T',
        description: 'D',
        priorite: 'NORMALE',
        departementId: 1,
        categorieId: 2,
      };

      await service.create(dto as any, employe.userId);

      expect(prisma.__tx.demande.create).toHaveBeenCalled();
      expect(prisma.__tx.approbation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ demandeId: 100, etapeId: 7 }),
        }),
      );
      expect(prisma.__tx.historiqueAction.create).toHaveBeenCalled();
      expect(notificationService.notifyByRole).toHaveBeenCalled();
      expect(notificationService.notify).toHaveBeenCalled();
    });

    it("rejette si la catégorie n'appartient pas au département", async () => {
      prisma.departement.findUnique.mockResolvedValue({ id: 1, nom: 'IT' });
      prisma.categorie.findUnique.mockResolvedValue({
        id: 2,
        nom: 'Bug',
        departementId: 999,
        delaiReponse: 4,
        delaiResolution: 24,
      });

      const dto = {
        titre: 'T',
        description: 'D',
        priorite: 'NORMALE',
        departementId: 1,
        categorieId: 2,
      };

      await expect(service.create(dto as any, employe.userId)).rejects.toThrow(ForbiddenException);
    });
  });
});
