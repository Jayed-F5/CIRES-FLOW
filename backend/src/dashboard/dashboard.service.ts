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
}