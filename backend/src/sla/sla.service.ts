import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatutDemande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

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
          this.logger.warn(`[SLA DÉPASSÉ] Demande #${demande.id} "${demande.titre}"`);

          await this.notificationService.notify(
            demande.demandeurId,
            `Votre demande #${demande.id} "${demande.titre}" a dépassé le délai de résolution prévu`,
            `/demande/${demande.id}`,
          );

          await this.prisma.demande.update({
            where: { id: demande.id },
            data: { alerteDepasseEnvoyee: true },
          });
        } else if (estARisque && !demande.alerteRisqueEnvoyee) {
          this.logger.warn(`[SLA À RISQUE] Demande #${demande.id} "${demande.titre}"`);

          await this.notificationService.notify(
            demande.demandeurId,
            `Votre demande #${demande.id} "${demande.titre}" approche de son délai de résolution (moins d'1h restante)`,
            `/demande/${demande.id}`,
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
          this.logger.warn(`[SLA RÉPONSE DÉPASSÉ] Demande #${demande.id} "${demande.titre}"`);

          await this.notificationService.notify(
            demande.demandeurId,
            `Votre demande #${demande.id} "${demande.titre}" n'a toujours pas reçu de réponse`,
            `/demande/${demande.id}`,
          );

          await this.prisma.demande.update({
            where: { id: demande.id },
            data: { alerteReponseDepasseEnvoyee: true },
          });
        } else if (estARisque && !demande.alerteReponseRisqueEnvoyee) {
          this.logger.warn(`[SLA RÉPONSE À RISQUE] Demande #${demande.id} "${demande.titre}"`);

          await this.notificationService.notify(
            demande.demandeurId,
            `Votre demande #${demande.id} "${demande.titre}" attend une première réponse (moins d'1h restante)`,
            `/demande/${demande.id}`,
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