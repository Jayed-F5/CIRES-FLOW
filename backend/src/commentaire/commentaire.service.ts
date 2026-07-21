import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role, VisibiliteCommentaire } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoriqueService } from '../historique/historique.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

@Injectable()
export class CommentaireService {
  private readonly logger = new Logger(CommentaireService.name);

  constructor(
    private prisma: PrismaService,
    private historiqueService: HistoriqueService,
    private notificationService: NotificationService,
  ) {}

  async create(demandeId: number, dto: CreateCommentaireDto, user: CurrentUser) {
    const demande = await this.prisma.demande.findUnique({
      where: { id: demandeId },
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

    if (user.role === Role.EMPLOYE && dto.visibilite === VisibiliteCommentaire.INTERNE) {
      throw new ForbiddenException(
        'Un employé ne peut créer que des commentaires publics',
      );
    }

    const commentaire = await this.prisma.commentaire.create({
      data: {
        demandeId,
        auteurId: user.userId,
        contenu: dto.contenu,
        visibilite: dto.visibilite,
      },
    });

    await this.historiqueService.logAction(
      demandeId,
      user.userId,
      `COMMENTAIRE:${dto.visibilite}`,
    );

    if (!demande.dateReponse) {
      await this.prisma.demande.update({
        where: { id: demandeId },
        data: { dateReponse: new Date() },
      });
      this.logger.log(`[SLA RÉPONSE] Première réponse enregistrée pour la demande #${demandeId}`);
    }

    if (dto.visibilite === VisibiliteCommentaire.PUBLIC && demande.demandeurId !== user.userId) {
      await this.notificationService.notify(
        demande.demandeurId,
        `Nouveau commentaire public sur votre demande #${demandeId} : "${demande.titre}"`,
        `/demande/${demandeId}`,
      );
    }

    if (demande.agentId && demande.agentId !== user.userId) {
      await this.notificationService.notify(
        demande.agentId,
        `Nouveau commentaire (${dto.visibilite}) sur la demande #${demandeId} : "${demande.titre}"`,
        `/demande/${demandeId}`,
      );
    }

    return commentaire;
  }

  async findByDemande(demandeId: number, user: CurrentUser) {
    const demande = await this.prisma.demande.findUnique({
      where: { id: demandeId },
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

    const where =
      user.role === Role.EMPLOYE
        ? { demandeId, visibilite: VisibiliteCommentaire.PUBLIC }
        : { demandeId };

    return this.prisma.commentaire.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }
}