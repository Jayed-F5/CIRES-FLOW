import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatutDemande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaDeadlines() {
    const now = new Date();
    const seuilRisque = new Date(now.getTime() + 60 * 60 * 1000); // dans 1h

    const demandesOuvertes = await this.prisma.demande.findMany({
      where: {
        statut: {
          notIn: [StatutDemande.CLOTURE, StatutDemande.REJETE, StatutDemande.ANNULE],
        },
        dateLimiteSLA: { not: null },
      },
    });

    for (const demande of demandesOuvertes) {
      if (!demande.dateLimiteSLA) continue;

      if (demande.dateLimiteSLA < now) {
        this.logger.warn(
          `[SLA DÉPASSÉ] Demande #${demande.id} "${demande.titre}" — limite était ${demande.dateLimiteSLA.toISOString()}`,
        );
      } else if (demande.dateLimiteSLA < seuilRisque) {
        this.logger.warn(
          `[SLA À RISQUE] Demande #${demande.id} "${demande.titre}" — limite dans moins d'1h (${demande.dateLimiteSLA.toISOString()})`,
        );
      }
    }
  }
}