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

    // Ne charge que les demandes qui peuvent encore déclencher une alerte :
    // au moins une des deux horloges (résolution / réponse) approche ou a
    // dépassé son seuil, et n'a pas déjà été entièrement notifiée sur cette
    // horloge. Avant, ce job chargeait *toutes* les demandes ouvertes à
    // chaque minute, ce qui ne passe pas à l'échelle une fois qu'il y en a
    // des centaines en cours.
    const demandesApprochantEcheance = await this.prisma.demande.findMany({
      where: {
        statut: {
          notIn: [
            StatutDemande.CLOTURE,
            StatutDemande.REJETE,
            StatutDemande.ANNULE,
          ],
        },
        OR: [
          {
            dateLimiteSLA: { lte: seuilRisque },
            NOT: { alerteDepasseEnvoyee: true, alerteRisqueEnvoyee: true },
          },
          {
            dateLimiteReponse: { lte: seuilRisque },
            dateReponse: null,
            NOT: {
              alerteReponseDepasseEnvoyee: true,
              alerteReponseRisqueEnvoyee: true,
            },
          },
        ],
      },
      select: {
        id: true,
        titre: true,
        demandeurId: true,
        dateLimiteSLA: true,
        dateLimiteReponse: true,
        dateReponse: true,
        alerteDepasseEnvoyee: true,
        alerteRisqueEnvoyee: true,
        alerteReponseDepasseEnvoyee: true,
        alerteReponseRisqueEnvoyee: true,
      },
    });

    // Chaque demande est indépendante des autres : on les traite en
    // parallèle plutôt qu'en série pour ne pas laisser le job traîner sur
    // la minute suivante quand plusieurs demandes approchent leur échéance
    // en même temps.
    await Promise.all(
      demandesApprochantEcheance.map((demande) =>
        this.processDemande(demande, now, seuilRisque),
      ),
    );
  }

  private async processDemande(
    demande: {
      id: number;
      titre: string;
      demandeurId: number;
      dateLimiteSLA: Date | null;
      dateLimiteReponse: Date | null;
      dateReponse: Date | null;
      alerteDepasseEnvoyee: boolean;
      alerteRisqueEnvoyee: boolean;
      alerteReponseDepasseEnvoyee: boolean;
      alerteReponseRisqueEnvoyee: boolean;
    },
    now: Date,
    seuilRisque: Date,
  ) {
    // --- Horloge 1 : résolution (delaiResolution) ---
    if (demande.dateLimiteSLA) {
      const estDepassee = demande.dateLimiteSLA < now;
      const estARisque = !estDepassee && demande.dateLimiteSLA < seuilRisque;

      if (estDepassee && !demande.alerteDepasseEnvoyee) {
        this.logger.warn(
          `[SLA DÉPASSÉ] Demande #${demande.id} "${demande.titre}"`,
        );

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
        this.logger.warn(
          `[SLA À RISQUE] Demande #${demande.id} "${demande.titre}"`,
        );

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

    // --- Horloge 2 : réponse (delaiReponse) — seulement si pas encore répondu ---
    if (demande.dateLimiteReponse && !demande.dateReponse) {
      const estDepassee = demande.dateLimiteReponse < now;
      const estARisque =
        !estDepassee && demande.dateLimiteReponse < seuilRisque;

      if (estDepassee && !demande.alerteReponseDepasseEnvoyee) {
        this.logger.warn(
          `[SLA RÉPONSE DÉPASSÉ] Demande #${demande.id} "${demande.titre}"`,
        );

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
        this.logger.warn(
          `[SLA RÉPONSE À RISQUE] Demande #${demande.id} "${demande.titre}"`,
        );

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