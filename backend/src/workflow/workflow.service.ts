import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, StatutApprobation, StatutDemande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoriqueService } from '../historique/historique.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { DecideApprobationDto } from './dto/decide-approbation.dto';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

@Injectable()
export class WorkflowService {
  constructor(
    private prisma: PrismaService,
    private historiqueService: HistoriqueService,
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

    await this.prisma.approbation.update({
      where: { id: approbationId },
      data: {
        statut: dto.statut,
        commentaire: dto.commentaire,
        date: new Date(),
        approbateurId: user.userId,
      },
    });

    await this.historiqueService.logAction(
      approbation.demandeId,
      user.userId,
      `APPROBATION:etape_${approbation.etape.ordre}:${dto.statut}`,
    );

    if (dto.statut === StatutApprobation.REJETE) {
      const demande = await this.prisma.demande.update({
        where: { id: approbation.demandeId },
        data: { statut: StatutDemande.REJETE },
      });

      await this.historiqueService.logAction(
        approbation.demandeId,
        user.userId,
        `CHANGEMENT_STATUT:${approbation.demande.statut}->REJETE`,
      );

      return demande;
    }

    const prochaineEtape = await this.prisma.workflowEtape.findFirst({
      where: {
        categorieId: approbation.demande.categorieId,
        ordre: { gt: approbation.etape.ordre },
      },
      orderBy: { ordre: 'asc' },
    });

    if (prochaineEtape) {
      await this.prisma.approbation.create({
        data: {
          demandeId: approbation.demandeId,
          etapeId: prochaineEtape.id,
          statut: StatutApprobation.EN_ATTENTE,
        },
      });

      return this.prisma.demande.findUnique({ where: { id: approbation.demandeId } });
    }

    const demande = await this.prisma.demande.update({
      where: { id: approbation.demandeId },
      data: { statut: StatutDemande.EN_COURS },
    });

    await this.historiqueService.logAction(
      approbation.demandeId,
      user.userId,
      `CHANGEMENT_STATUT:${approbation.demande.statut}->EN_COURS`,
    );

    return demande;
  }
}