import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, StatutApprobation, StatutDemande } from '@prisma/client';
import { WorkflowService } from './workflow.service';

function createMockPrisma() {
  const tx = {
    approbation: { updateMany: jest.fn(), create: jest.fn() },
    historiqueAction: { create: jest.fn() },
    demande: { update: jest.fn(), findUnique: jest.fn() },
    workflowEtape: { findFirst: jest.fn() },
  };

  return {
    approbation: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    categorie: { findUnique: jest.fn() },
    workflowEtape: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (txArg: typeof tx) => unknown) => callback(tx)),
    __tx: tx,
  };
}

function createMockNotification() {
  return { notify: jest.fn(), notifyByRole: jest.fn() };
}

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let notificationService: ReturnType<typeof createMockNotification>;

  const manager = { userId: 1, role: Role.MANAGER, departementId: 1 };

  const baseApprobation = {
    id: 42,
    demandeId: 7,
    etapeId: 3,
    statut: StatutApprobation.EN_ATTENTE,
    etape: { id: 3, ordre: 1, roleApprobateur: Role.MANAGER, categorieId: 9 },
    demande: {
      id: 7,
      titre: 'Demande test',
      statut: StatutDemande.EN_ATTENTE_APPROBATION,
      categorieId: 9,
      departementId: 1,
      demandeurId: 55,
    },
  };

  beforeEach(() => {
    prisma = createMockPrisma();
    notificationService = createMockNotification();
    service = new WorkflowService(prisma as any, notificationService as any);
  });

  describe('decideApprobation', () => {
    it("lève NotFoundException si l'approbation n'existe pas", async () => {
      prisma.approbation.findUnique.mockResolvedValue(null);
      await expect(
        service.decideApprobation(1, { statut: StatutApprobation.APPROUVE } as any, manager),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejette si l\'approbation a déjà été traitée', async () => {
      prisma.approbation.findUnique.mockResolvedValue({
        ...baseApprobation,
        statut: StatutApprobation.APPROUVE,
      });
      await expect(
        service.decideApprobation(42, { statut: StatutApprobation.APPROUVE } as any, manager),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejette si l'utilisateur n'a pas le bon rôle", async () => {
      prisma.approbation.findUnique.mockResolvedValue(baseApprobation);
      const wrongRoleUser = { ...manager, role: Role.AGENT };
      await expect(
        service.decideApprobation(42, { statut: StatutApprobation.APPROUVE } as any, wrongRoleUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejette un manager d'un autre département", async () => {
      prisma.approbation.findUnique.mockResolvedValue(baseApprobation);
      const managerAutreDepartement = { ...manager, departementId: 2 };
      await expect(
        service.decideApprobation(
          42,
          { statut: StatutApprobation.APPROUVE } as any,
          managerAutreDepartement,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('détecte la course (race condition) si déjà traitée entretemps', async () => {
      prisma.approbation.findUnique.mockResolvedValue(baseApprobation);
      // Simule une requête concurrente qui gagne la mise à jour en premier.
      prisma.__tx.approbation.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.decideApprobation(42, { statut: StatutApprobation.APPROUVE } as any, manager),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette la demande et notifie le demandeur quand REJETE', async () => {
      prisma.approbation.findUnique.mockResolvedValue(baseApprobation);
      prisma.__tx.approbation.updateMany.mockResolvedValue({ count: 1 });
      prisma.__tx.demande.update.mockResolvedValue({
        ...baseApprobation.demande,
        statut: StatutDemande.REJETE,
      });

      const result = await service.decideApprobation(
        42,
        { statut: StatutApprobation.REJETE } as any,
        manager,
      );

      expect(result!.statut).toBe(StatutDemande.REJETE);
      expect(prisma.__tx.demande.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: StatutDemande.REJETE } }),
      );
      expect(notificationService.notify).toHaveBeenCalledWith(
        baseApprobation.demande.demandeurId,
        expect.stringContaining('rejetée'),
        expect.any(String),
      );
    });

    it("crée l'approbation de l'étape suivante et notifie son approbateur quand APPROUVE", async () => {
      prisma.approbation.findUnique.mockResolvedValue(baseApprobation);
      prisma.__tx.approbation.updateMany.mockResolvedValue({ count: 1 });
      prisma.__tx.workflowEtape.findFirst.mockResolvedValue({
        id: 4,
        ordre: 2,
        roleApprobateur: Role.ADMIN,
        categorieId: 9,
      });
      prisma.__tx.demande.findUnique.mockResolvedValue(baseApprobation.demande);

      await service.decideApprobation(42, { statut: StatutApprobation.APPROUVE } as any, manager);

      expect(prisma.__tx.approbation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ demandeId: 7, etapeId: 4, statut: StatutApprobation.EN_ATTENTE }),
        }),
      );
      expect(notificationService.notifyByRole).toHaveBeenCalledWith(
        Role.ADMIN,
        baseApprobation.demande.departementId,
        expect.any(String),
        expect.any(String),
      );
    });

    it("fait passer la demande à EN_COURS quand c'est la dernière étape", async () => {
      prisma.approbation.findUnique.mockResolvedValue(baseApprobation);
      prisma.__tx.approbation.updateMany.mockResolvedValue({ count: 1 });
      prisma.__tx.workflowEtape.findFirst.mockResolvedValue(null);
      prisma.__tx.demande.update.mockResolvedValue({
        ...baseApprobation.demande,
        statut: StatutDemande.EN_COURS,
      });

      const result = await service.decideApprobation(
        42,
        { statut: StatutApprobation.APPROUVE } as any,
        manager,
      );

      expect(result!.statut).toBe(StatutDemande.EN_COURS);
      expect(notificationService.notify).toHaveBeenCalledWith(
        baseApprobation.demande.demandeurId,
        expect.stringContaining('en cours'),
        expect.any(String),
      );
    });
  });

  describe('removeEtape', () => {
    it('refuse de supprimer une étape ayant des approbations rattachées', async () => {
      prisma.workflowEtape.findUnique.mockResolvedValue({ id: 3, categorieId: 9, ordre: 1 });
      prisma.approbation.count.mockResolvedValue(2);

      await expect(service.removeEtape(3)).rejects.toThrow('rattachées');
    });

    it('supprime une étape sans approbations', async () => {
      prisma.workflowEtape.findUnique.mockResolvedValue({ id: 3, categorieId: 9, ordre: 1 });
      prisma.approbation.count.mockResolvedValue(0);
      prisma.workflowEtape.delete.mockResolvedValue({ id: 3 });

      const result = await service.removeEtape(3);
      expect(result).toEqual({ id: 3 });
    });
  });
});
