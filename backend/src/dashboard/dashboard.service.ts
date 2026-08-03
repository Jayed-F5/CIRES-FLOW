import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { calculerIndicateurSLA } from '../demande/demande.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private buildScopeWhere(user: CurrentUser): Record<string, any> {
    if (user.role === Role.EMPLOYE) {
      return { demandeurId: user.userId };
    }
    if (user.role === Role.AGENT || user.role === Role.MANAGER) {
      if (user.departementId === null) {
        throw new BadRequestException(
          "Votre compte n'est rattaché à aucun département : impossible de calculer les statistiques",
        );
      }
      return { departementId: user.departementId };
    }
    return {};
  }

  // Fusionne les filtres optionnels (période, statut, catégorie) fournis par le client
  // au périmètre déjà imposé par le rôle de l'utilisateur.
  private buildFilterWhere(filters: DashboardFilterDto): Record<string, any> {
    const where: Record<string, any> = {};

    if (filters.dateFrom || filters.dateTo) {
      where.dateCreation = {};
      if (filters.dateFrom) {
        where.dateCreation.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.dateCreation.lte = endOfDay;
      }
    }

    if (filters.statut) {
      where.statut = filters.statut;
    }

    if (filters.categorieId) {
      where.categorieId = filters.categorieId;
    }

    return where;
  }

  async getStatsGlobales(user: CurrentUser, filters: DashboardFilterDto = {}) {
    const scopeWhere = { ...this.buildScopeWhere(user), ...this.buildFilterWhere(filters) };

    const [parStatut, parCategorie, parDepartement, total] = await Promise.all([
      this.prisma.demande.groupBy({
        by: ['statut'],
        where: scopeWhere,
        _count: { _all: true },
      }),
      this.prisma.demande.groupBy({
        by: ['categorieId'],
        where: scopeWhere,
        _count: { _all: true },
      }),
      this.prisma.demande.groupBy({
        by: ['departementId'],
        where: scopeWhere,
        _count: { _all: true },
      }),
      this.prisma.demande.count({ where: scopeWhere }),
    ]);

    const categorieIds = parCategorie.map((c) => c.categorieId);
    const departementIds = parDepartement.map((d) => d.departementId);

    const [categories, departements] = await Promise.all([
      this.prisma.categorie.findMany({
        where: { id: { in: categorieIds } },
        select: { id: true, nom: true },
      }),
      this.prisma.departement.findMany({
        where: { id: { in: departementIds } },
        select: { id: true, nom: true },
      }),
    ]);

    return {
      total,
      parStatut: parStatut.map((s) => ({
        statut: s.statut,
        count: s._count._all,
      })),
      parCategorie: parCategorie.map((c) => ({
        categorieId: c.categorieId,
        nom: categories.find((cat) => cat.id === c.categorieId)?.nom ?? 'Inconnu',
        count: c._count._all,
      })),
      parDepartement: parDepartement.map((d) => ({
        departementId: d.departementId,
        nom: departements.find((dep) => dep.id === d.departementId)?.nom ?? 'Inconnu',
        count: d._count._all,
      })),
    };
  }

  async getPerformanceStats(user: CurrentUser, filters: DashboardFilterDto = {}) {
    const scopeWhere = this.buildScopeWhere(user);
    // Par défaut on exclut les demandes annulées ; un filtre statut explicite prend le dessus.
    const baseWhere: any = {
      ...scopeWhere,
      statut: { not: 'ANNULE' },
      ...this.buildFilterWhere(filters),
    };

    const demandesCloturees = await this.prisma.demande.findMany({
      where: { ...baseWhere, dateCloture: { not: null } },
      select: { dateCreation: true, dateCloture: true, dateLimiteSLA: true },
    });

    const demandesAvecReponse = await this.prisma.demande.findMany({
      where: { ...baseWhere, dateReponse: { not: null } },
      select: { dateCreation: true, dateReponse: true },
    });

    let tempsMoyenResolutionHeures: number | null = null;
    if (demandesCloturees.length > 0) {
      const totalMs = demandesCloturees.reduce(
        (sum, d) => sum + (d.dateCloture!.getTime() - d.dateCreation.getTime()),
        0,
      );
      tempsMoyenResolutionHeures = totalMs / demandesCloturees.length / (1000 * 60 * 60);
    }

    let tempsMoyenReponseHeures: number | null = null;
    if (demandesAvecReponse.length > 0) {
      const totalMs = demandesAvecReponse.reduce(
        (sum, d) => sum + (d.dateReponse!.getTime() - d.dateCreation.getTime()),
        0,
      );
      tempsMoyenReponseHeures = totalMs / demandesAvecReponse.length / (1000 * 60 * 60);
    }

    let tauxRespectSLAPourcent: number | null = null;
    const demandesAvecSLA = demandesCloturees.filter((d) => d.dateLimiteSLA !== null);
    if (demandesAvecSLA.length > 0) {
      const respectees = demandesAvecSLA.filter(
        (d) => d.dateCloture!.getTime() <= d.dateLimiteSLA!.getTime(),
      ).length;
      tauxRespectSLAPourcent = (respectees / demandesAvecSLA.length) * 100;
    }

    return {
      tempsMoyenResolutionHeures,
      tempsMoyenReponseHeures,
      tauxRespectSLAPourcent,
      nombreDemandesClotureesAnalysees: demandesCloturees.length,
      nombreDemandesAvecReponseAnalysees: demandesAvecReponse.length,
    };
  }

  async getKpiStats(user: CurrentUser, filters: DashboardFilterDto = {}) {
    const scopeWhere = { ...this.buildScopeWhere(user), ...this.buildFilterWhere(filters) };

    const demandes = await this.prisma.demande.findMany({
      where: scopeWhere,
      select: { statut: true, dateLimiteSLA: true },
    });

    let actives = 0;
    let enAttenteApprobation = 0;
    let slaRespecte = 0;
    let slaARisque = 0;
    let slaDepasse = 0;

    for (const d of demandes) {
      if (['NOUVEAU', 'EN_ATTENTE_APPROBATION', 'EN_COURS'].includes(d.statut)) {
        actives++;
      }
      if (d.statut === 'EN_ATTENTE_APPROBATION') {
        enAttenteApprobation++;
      }

      const indicateur = calculerIndicateurSLA(d as any);
      if (indicateur === 'RESPECTE') slaRespecte++;
      if (indicateur === 'A_RISQUE') slaARisque++;
      if (indicateur === 'DEPASSE') slaDepasse++;
    }

    return {
      demandesActives: actives,
      enAttenteApprobation,
      slaDepasses: slaDepasse,
      slaRespectees: slaRespecte,
      slaARisque,
    };
  }
}