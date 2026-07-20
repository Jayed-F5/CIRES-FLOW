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
    const seuilRisque = new Date(now.getTime() + 60 * 60 * 1000);

    const demandesOuvertes = await this.prisma.demande.findMany({
      where: {
        statut: {
          notIn: [StatutDemande.CLOTURE, StatutDemande.REJETE, StatutDemande.ANNULE],
        },
      },
    });

    for (const demande of demandesOuvertes) {
      // --- Clock 1: résolution (delaiResolution) ---
      if (demande.dateLimiteSLA) {
        const estDepassee = demande.dateLimiteSLA < now;
        const estARisque = !estDepassee && demande.dateLimiteSLA < seuilRisque;

        if (estDepassee && !demande.alerteDepasseEnvoyee) {
          this.logger.warn(
            `[SLA DÉPASSÉ] Demande #${demande.id} "${demande.titre}" — limite était ${demande.dateLimiteSLA.toISOString()}`,
          );
          await this.prisma.demande.update({
            where: { id: demande.id },
            data: { alerteDepasseEnvoyee: true },
          });
        } else if (estARisque && !demande.alerteRisqueEnvoyee) {
          this.logger.warn(
            `[SLA À RISQUE] Demande #${demande.id} "${demande.titre}" — limite dans moins d'1h (${demande.dateLimiteSLA.toISOString()})`,
          );
          await this.prisma.demande.update({
            where: { id: demande.id },
            data: { alerteRisqueEnvoyee: true },
          });
        }
      }

      // --- Clock 2: réponse (delaiReponse) — seulement si pas encore répondu ---
      if (demande.dateLimiteReponse && !demande.dateReponse) {
        const estDepassee = demande.dateLimiteReponse < now;
        const estARisque = !estDepassee && demande.dateLimiteReponse < seuilRisque;

        if (estDepassee && !demande.alerteReponseDepasseEnvoyee) {
          this.logger.warn(
            `[SLA RÉPONSE DÉPASSÉ] Demande #${demande.id} "${demande.titre}" — aucune réponse depuis ${demande.dateLimiteReponse.toISOString()}`,
          );
          await this.prisma.demande.update({
            where: { id: demande.id },
            data: { alerteReponseDepasseEnvoyee: true },
          });
        } else if (estARisque && !demande.alerteReponseRisqueEnvoyee) {
          this.logger.warn(
            `[SLA RÉPONSE À RISQUE] Demande #${demande.id} "${demande.titre}" — réponse attendue dans moins d'1h (${demande.dateLimiteReponse.toISOString()})`,
          );
          await this.prisma.demande.update({
            where: { id: demande.id },
            data: { alerteReponseRisqueEnvoyee: true },
          });
        }
      }
    }
  }
}