import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private transporter?: nodemailer.Transporter;
  private readonly emailFrom: string;

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {
    this.emailFrom =
      process.env.SMTP_FROM ?? '"Cires Flow" <no-reply@cires-flow.local>';
  }

  async onModuleInit() {
    try {
      if (process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });
        this.logger.log(`Serveur SMTP configuré : ${process.env.SMTP_HOST}`);
        return;
      }

      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.warn(
        `Aucun SMTP_HOST configuré — utilisation d'un compte email de test Ethereal : ${testAccount.user}`,
      );
    } catch (error) {
      this.logger.error(
        "Impossible d'initialiser le transport email — les notifications par email seront désactivées",
        error,
      );
    }
  }

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email non envoyé à ${to} : aucun transport email disponible`,
      );
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.emailFrom,
        to,
        subject,
        text,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`Email envoyé à ${to} — aperçu : ${previewUrl}`);
      } else {
        this.logger.log(`Email envoyé à ${to}`);
      }
    } catch (error) {
      this.logger.error(`Échec de l'envoi de l'email à ${to}`, error);
    }
  }

  async notify(utilisateurId: number, message: string, lien?: string) {
    const notification = await this.prisma.notification.create({
      data: {
        utilisateurId,
        message,
        lien,
      },
    });

    this.notificationGateway.sendToUser(
      utilisateurId,
      'notification',
      notification,
    );

    // L'envoi d'email passe par un aller-retour SMTP externe qui peut prendre
    // plusieurs secondes — on ne bloque pas le cycle requête/réponse pour ça.
    this.prisma.utilisateur
      .findUnique({ where: { id: utilisateurId } })
      .then((user) => {
        if (user) {
          void this.sendEmail(
            user.email,
            'Nouvelle notification - Cires Flow',
            message,
          );
        }
      })
      .catch((error) =>
        this.logger.error(
          "Échec de la récupération du destinataire de l'email",
          error,
        ),
      );

    return notification;
  }

  async notifyByRole(
    role: Role,
    departementId: number,
    message: string,
    lien?: string,
  ) {
    const users = await this.prisma.utilisateur.findMany({
      where: { role, departementId },
    });

    for (const user of users) {
      await this.notify(user.id, message, lien);
    }
  }

  // Un compte actif depuis longtemps (ADMIN/MANAGER en particulier, qui
  // reçoivent des notifications sur toute leur file) peut accumuler des
  // milliers de lignes : on pagine plutôt que de tout renvoyer d'un coup.
  async findMine(utilisateurId: number, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { utilisateurId },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { utilisateurId } }),
    ]);

    return {
      data,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / take),
    };
  }

  async countUnread(utilisateurId: number) {
    const count = await this.prisma.notification.count({
      where: { utilisateurId, lu: false },
    });
    return { count };
  }

  async markAsRead(notificationId: number, utilisateurId: number) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, utilisateurId },
      data: { lu: true },
    });
  }

  async markAllAsRead(utilisateurId: number) {
    return this.prisma.notification.updateMany({
      where: { utilisateurId, lu: false },
      data: { lu: true },
    });
  }
}