import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, StatutApprobation, StatutDemande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { DecideApprobationDto } from './dto/decide-approbation.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

@Injectable()
export class WorkflowService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createEtape(dto: CreateEtapeDto) {
    const categorie = await this.prisma.categorie.findUnique({
      where: { id: dto.categorieId },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const existing = await this.prisma.workflowEtape.findUnique({
      where: {
        categorieId_ordre: {
          categorieId: dto.categorieId,
          ordre: dto.ordre,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Une étape avec l'ordre ${dto.ordre} existe déjà pour cette catégorie`,
      );
    }

    return this.prisma.workflowEtape.create({
      data: {
        categorieId: dto.categorieId,
        ordre: dto.ordre,
        roleApprobateur: dto.roleApprobateur,
      },
    });
  }

  async findByCategorie(categorieId: number) {
    return this.prisma.workflowEtape.findMany({
      where: { categorieId },
      orderBy: { ordre: 'asc' },
    });
  }

  async decideApprobation(approbationId: number, dto: DecideApprobationDto, user: CurrentUser) {
    const approbation = await this.prisma.approbation.findUnique({
      where: { id: approbationId },
      include: { etape: true, demande: true },
    });

    if (!approbation) {
      throw new NotFoundException('Approbation introuvable');
    }

    if (approbation.statut !== StatutApprobation.EN_ATTENTE) {
      throw new BadRequestException('Cette étape a déjà été traitée');
    }

    if (user.role !== approbation.etape.roleApprobateur) {
      throw new ForbiddenException(
        `Seul un utilisateur avec le rôle ${approbation.etape.roleApprobateur} peut traiter cette étape`,
      );
    }

    if (
      (user.role === Role.AGENT || user.role === Role.MANAGER) &&
      approbation.demande.departementId !== user.departementId
    ) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette demande');
    }

    let sendNotification: (() => Promise<unknown>) | undefined;

    const demande = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.approbation.updateMany({
        where: { id: approbationId, statut: StatutApprobation.EN_ATTENTE },
        data: {
          statut: dto.statut,
          commentaire: dto.commentaire,
          date: new Date(),
          approbateurId: user.userId,
        },
      });

      if (count === 0) {
        throw new BadRequestException('Cette étape a déjà été traitée');
      }

      await tx.historiqueAction.create({
        data: {
          demandeId: approbation.demandeId,
          auteurId: user.userId,
          action: `APPROBATION:etape_${approbation.etape.ordre}:${dto.statut}`,
        },
      });

      if (dto.statut === StatutApprobation.REJETE) {
        const updated = await tx.demande.update({
          where: { id: approbation.demandeId },
          data: { statut: StatutDemande.REJETE },
        });

        await tx.historiqueAction.create({
          data: {
            demandeId: approbation.demandeId,
            auteurId: user.userId,
            action: `CHANGEMENT_STATUT:${approbation.demande.statut}->REJETE`,
          },
        });

        sendNotification = () =>
          this.notificationService.notify(
            approbation.demande.demandeurId,
            `Votre demande #${approbation.demandeId} "${approbation.demande.titre}" a été rejetée`,
            `/demande/${approbation.demandeId}`,
          );

        return updated;
      }

      const prochaineEtape = await tx.workflowEtape.findFirst({
        where: {
          categorieId: approbation.demande.categorieId,
          ordre: { gt: approbation.etape.ordre },
        },
        orderBy: { ordre: 'asc' },
      });

      if (prochaineEtape) {
        await tx.approbation.create({
          data: {
            demandeId: approbation.demandeId,
            etapeId: prochaineEtape.id,
            statut: StatutApprobation.EN_ATTENTE,
          },
        });

        sendNotification = () =>
          this.notificationService.notifyByRole(
            prochaineEtape.roleApprobateur,
            approbation.demande.departementId,
            `Une demande #${approbation.demandeId} "${approbation.demande.titre}" attend votre approbation`,
            `/demande/${approbation.demandeId}`,
          );

        return tx.demande.findUnique({ where: { id: approbation.demandeId } });
      }

      const updated = await tx.demande.update({
        where: { id: approbation.demandeId },
        data: { statut: StatutDemande.EN_COURS },
      });

      await tx.historiqueAction.create({
        data: {
          demandeId: approbation.demandeId,
          auteurId: user.userId,
          action: `CHANGEMENT_STATUT:${approbation.demande.statut}->EN_COURS`,
        },
      });

      sendNotification = () =>
        this.notificationService.notify(
          approbation.demande.demandeurId,
          `Votre demande #${approbation.demandeId} "${approbation.demande.titre}" est maintenant en cours de traitement`,
          `/demande/${approbation.demandeId}`,
        );

      return updated;
    });

    await sendNotification?.();

    return demande;
  }

  async findByDemande(demandeId: number, user: CurrentUser) {
    const demande = await this.prisma.demande.findUnique({
      where: { id: demandeId },
    });

    if (!demande) {
      throw new NotFoundException('Demande non trouvée');
    }

    if (user.role === Role.EMPLOYE && demande.demandeurId !== user.userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette demande');
    }

    if (
      (user.role === Role.AGENT || user.role === Role.MANAGER) &&
      demande.departementId !== user.departementId
    ) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette demande');
    }

    return this.prisma.approbation.findMany({
      where: { demandeId },
      include: { etape: true },
      orderBy: { etape: { ordre: 'asc' } },
    });
  }
  async updateEtape(id: number, dto: UpdateEtapeDto) {
  const etape = await this.prisma.workflowEtape.findUnique({ where: { id } });
  if (!etape) {
    throw new NotFoundException('Étape introuvable');
  }

  if (dto.ordre !== undefined && dto.ordre !== etape.ordre) {
    const conflict = await this.prisma.workflowEtape.findUnique({
      where: {
        categorieId_ordre: {
          categorieId: etape.categorieId,
          ordre: dto.ordre,
        },
      },
    });
    if (conflict) {
      throw new ConflictException(
        `Une étape avec l'ordre ${dto.ordre} existe déjà pour cette catégorie`,
      );
    }
  }

  return this.prisma.workflowEtape.update({
    where: { id },
    data: dto,
  });
}

async removeEtape(id: number) {
  const etape = await this.prisma.workflowEtape.findUnique({ where: { id } });
  if (!etape) {
    throw new NotFoundException('Étape introuvable');
  }

  const approbationsLiees = await this.prisma.approbation.count({
    where: { etapeId: id },
  });
  if (approbationsLiees > 0) {
    throw new ConflictException(
      'Impossible de supprimer cette étape : des approbations y sont déjà rattachées',
    );
  }

  return this.prisma.workflowEtape.delete({ where: { id } });
}
}