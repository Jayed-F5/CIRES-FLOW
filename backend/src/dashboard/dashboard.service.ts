import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStatsGlobales(departementId?: number) {
    const where = departementId ? { departementId } : {};

    const [parStatut, parCategorie, parDepartement, total] = await Promise.all([
      this.prisma.demande.groupBy({
        by: ['statut'],
        where,
        _count: { _all: true },
      }),
      this.prisma.demande.groupBy({
        by: ['categorieId'],
        where,
        _count: { _all: true },
      }),
      this.prisma.demande.groupBy({
        by: ['departementId'],
        where: departementId ? { departementId } : {},
        _count: { _all: true },
      }),
      this.prisma.demande.count({ where }),
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

  async getPerformanceStats(departementId?: number) {
    const baseWhere: any = { statut: { not: 'ANNULE' } };
    if (departementId) baseWhere.departementId = departementId;

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
}