import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

@Injectable()
export class PieceJointeService {
  constructor(private prisma: PrismaService) {}

  private async checkAccesDemande(demandeId: number, user: CurrentUser) {
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

    return demande;
  }

  async create(demandeId: number, nomFichier: string, cheminFichier: string, user: CurrentUser) {
    await this.checkAccesDemande(demandeId, user);

    return this.prisma.pieceJointe.create({
      data: {
        demandeId,
        nomFichier,
        cheminFichier,
      },
    });
  }

  async findByDemande(demandeId: number, user: CurrentUser) {
    await this.checkAccesDemande(demandeId, user);

    return this.prisma.pieceJointe.findMany({
      where: { demandeId },
      orderBy: { dateUpload: 'asc' },
    });
  }

  async findOneForDownload(pieceJointeId: number, user: CurrentUser) {
    const piece = await this.prisma.pieceJointe.findUnique({
      where: { id: pieceJointeId },
    });

    if (!piece) {
      throw new NotFoundException('Pièce jointe non trouvée');
    }

    await this.checkAccesDemande(piece.demandeId, user);

    return piece;
  }
}