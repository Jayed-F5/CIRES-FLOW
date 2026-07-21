import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Priorite, Role, StatutDemande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoriqueService } from '../historique/historique.service';
import { NotificationService } from '../notification/notification.service';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { QueryDemandeDto } from './dto/query-demande.dto';
import { UpdateStatutDto } from './dto/update-statut.dto';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

const TRANSITIONS: Record<StatutDemande, StatutDemande[]> = {
  NOUVEAU: [StatutDemande.EN_ATTENTE_APPROBATION, StatutDemande.EN_COURS, StatutDemande.ANNULE],
  EN_ATTENTE_APPROBATION: [StatutDemande.EN_COURS, StatutDemande.REJETE, StatutDemande.ANNULE],
  EN_COURS: [StatutDemande.RESOLU],
  RESOLU: [StatutDemande.CLOTURE],
  CLOTURE: [],
  REJETE: [],
  ANNULE: [],
};

const PRIORITE_MULTIPLIER: Record<Priorite, number> = {
  URGENTE: 0.5,
  HAUTE: 0.75,
  NORMALE: 1,
  BASSE: 1.5,
};

const STATUTS_FERMES: StatutDemande[] = [
  StatutDemande.CLOTURE,
  StatutDemande.REJETE,
  StatutDemande.ANNULE,
];

function calculerIndicateurSLA(demande: {
  statut: StatutDemande;
  dateLimiteSLA: Date | null;
}): 'RESPECTE' | 'A_RISQUE' | 'DEPASSE' | 'NON_APPLICABLE' {
  if (!demande.dateLimiteSLA || STATUTS_FERMES.includes(demande.statut)) {
    return 'NON_APPLICABLE';
  }

  const now = new Date();
  const seuilRisque = new Date(now.getTime() + 60 * 60 * 1000);

  if (demande.dateLimiteSLA < now) {
    return 'DEPASSE';
  }

  if (demande.dateLimiteSLA < seuilRisque) {
    return 'A_RISQUE';
  }

  return 'RESPECTE';
}

@Injectable()
export class DemandeService {
  constructor(
    private prisma: PrismaService,
    private historiqueService: HistoriqueService,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreateDemandeDto, demandeurId: number) {
    const departement = await this.prisma.departement.findUnique({
      where: { id: dto.departementId },
    });

    if (!departement) {
      throw new NotFoundException('Département introuvable');
    }

    const categorie = await this.prisma.categorie.findUnique({
      where: { id: dto.categorieId },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    if (categorie.departementId !== dto.departementId) {
      throw new ForbiddenException(
        'Cette catégorie n\'appartient pas au département sélectionné',
      );
    }

    const premiereEtape = await this.prisma.workflowEtape.findFirst({
      where: { categorieId: dto.categorieId },
      orderBy: { ordre: 'asc' },
    });

    const statutInitial = premiereEtape
      ? StatutDemande.EN_ATTENTE_APPROBATION
      : StatutDemande.EN_COURS;

    const multiplicateur = PRIORITE_MULTIPLIER[dto.priorite];
    const dateLimiteSLA = new Date(
      Date.now() + categorie.delaiResolution * multiplicateur * 60 * 60 * 1000,
    );
    const dateLimiteReponse = new Date(
      Date.now() + categorie.delaiReponse * multiplicateur * 60 * 60 * 1000,
    );

    const demande = await this.prisma.demande.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        priorite: dto.priorite,
        departementId: dto.departementId,
        categorieId: dto.categorieId,
        demandeurId,
        metadata: dto.metadata,
        statut: statutInitial,
        dateLimiteSLA,
        dateLimiteReponse,
      },
    });

    if (premiereEtape) {
      await this.prisma.approbation.create({
        data: {
          demandeId: demande.id,
          etapeId: premiereEtape.id,
          statut: 'EN_ATTENTE',
        },
      });

      await this.notificationService.notifyByRole(
        premiereEtape.roleApprobateur,
        demande.departementId,
        `Une demande #${demande.id} "${demande.titre}" attend votre approbation`,
        `/demande/${demande.id}`,
      );
    }

    await this.historiqueService.logAction(demande.id, demandeurId, 'CREATION');

    await this.notificationService.notify(
      demandeurId,
      `Votre demande #${demande.id} "${demande.titre}" a été créée avec succès`,
      `/demande/${demande.id}`,
    );

    return { ...demande, indicateurSLA: calculerIndicateurSLA(demande) };
  }

  private buildScopeFilter(user: CurrentUser): Prisma.DemandeWhereInput {
    if (user.role === Role.EMPLOYE) {
      return { demandeurId: user.userId };
    }

    if (user.role === Role.AGENT) {
      return { departementId: user.departementId ?? -1 };
    }

    return {};
  }

  async findAll(query: QueryDemandeDto, user: CurrentUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DemandeWhereInput = {
      ...this.buildScopeFilter(user),
    };

    if (query.departementId) {
      where.departementId = query.departementId;
    }

    if (query.categorieId) {
      where.categorieId = query.categorieId;
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.priorite) {
      where.priorite = query.priorite;
    }

    if (query.search) {
      where.OR = [
        { titre: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [demandes, total] = await Promise.all([
      this.prisma.demande.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateCreation: 'desc' },
      }),
      this.prisma.demande.count({ where }),
    ]);

    return {
      data: demandes.map((d) => ({ ...d, indicateurSLA: calculerIndicateurSLA(d) })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, user: CurrentUser) {
    const demande = await this.prisma.demande.findUnique({
      where: { id },
    });

    if (!demande) {
      throw new NotFoundException('Demande non trouvée');
    }

    if (user.role === Role.EMPLOYE && demande.demandeurId !== user.userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette demande');
    }

    if (user.role === Role.AGENT && demande.departementId !== user.departementId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette demande');
    }

    return { ...demande, indicateurSLA: calculerIndicateurSLA(demande) };
  }

  async updateStatut(id: number, dto: UpdateStatutDto, user: CurrentUser) {
    const demande = await this.findOne(id, user);

    const allowedNextStatuts = TRANSITIONS[demande.statut];

    if (!allowedNextStatuts.includes(dto.statut)) {
      throw new BadRequestException(
        `Transition invalide : impossible de passer de ${demande.statut} à ${dto.statut}`,
      );
    }

    if (dto.statut === StatutDemande.ANNULE) {
      const isOwner = demande.demandeurId === user.userId;
      const isAdmin = user.role === Role.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new ForbiddenException(
          'Seul le demandeur ou un Admin peut annuler cette demande',
        );
      }
    }

    const data: Prisma.DemandeUpdateInput = { statut: dto.statut };

    if (dto.statut === StatutDemande.CLOTURE) {
      data.dateCloture = new Date();
    }

    const updated = await this.prisma.demande.update({
      where: { id },
      data,
    });

    await this.historiqueService.logAction(
      id,
      user.userId,
      `CHANGEMENT_STATUT:${demande.statut}->${dto.statut}`,
    );

    if (demande.demandeurId !== user.userId) {
      await this.notificationService.notify(
        demande.demandeurId,
        `Le statut de votre demande #${id} "${demande.titre}" est passé à ${dto.statut}`,
        `/demande/${id}`,
      );
    }

    return { ...updated, indicateurSLA: calculerIndicateurSLA(updated) };
  }
}