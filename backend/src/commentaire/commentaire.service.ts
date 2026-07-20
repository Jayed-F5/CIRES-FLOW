import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, VisibiliteCommentaire } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

@Injectable()
export class CommentaireService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.commentaire.create({
      data: {
        demandeId,
        auteurId: user.userId,
        contenu: dto.contenu,
        visibilite: dto.visibilite,
      },
    });
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