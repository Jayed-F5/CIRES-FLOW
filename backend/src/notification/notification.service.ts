import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private transporter!: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {}

  async onModuleInit() {
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

    this.logger.log(`Compte email de test créé : ${testAccount.user}`);
  }

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: '"Cires Flow" <no-reply@cires-flow.local>',
        to,
        subject,
        text,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      this.logger.log(`Email envoyé à ${to} — aperçu : ${previewUrl}`);
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

    const user = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
    });

    if (user) {
      await this.sendEmail(user.email, 'Nouvelle notification - Cires Flow', message);
    }

    this.notificationGateway.sendToUser(utilisateurId, 'notification', notification);

    return notification;
  }

  async notifyByRole(role: Role, departementId: number, message: string, lien?: string) {
    const users = await this.prisma.utilisateur.findMany({
      where: { role, departementId },
    });

    for (const user of users) {
      await this.notify(user.id, message, lien);
    }
  }

  async findMine(utilisateurId: number) {
    return this.prisma.notification.findMany({
      where: { utilisateurId },
      orderBy: { date: 'desc' },
    });
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