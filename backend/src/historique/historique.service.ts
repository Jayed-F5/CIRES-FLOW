import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CurrentUser {
  userId: number;
  role: Role;
  departementId: number | null;
}

@Injectable()
export class HistoriqueService {
  constructor(private prisma: PrismaService) {}

  async logAction(demandeId: number, auteurId: number, action: string) {
    return this.prisma.historiqueAction.create({
      data: {
        demandeId,
        auteurId,
        action,
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

    return this.prisma.historiqueAction.findMany({
      where: { demandeId },
      orderBy: { date: 'asc' },
    });
  }
}