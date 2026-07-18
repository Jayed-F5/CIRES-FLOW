import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDemandeDto } from './dto/create-demande.dto';

@Injectable()
export class DemandeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDemandeDto, demandeurId: number) {
    const departement = await this.prisma.departement.findUnique({
      where: { id: dto.departementId },
    });

    if (!departement) {
      throw new NotFoundException('Département introuvable');
    }

    const categorie = await this.prisma.categorie.findUnique({
      where: { id: dto.categorieId },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    if (categorie.departementId !== dto.departementId) {
      throw new ForbiddenException(
        'Cette catégorie n\'appartient pas au département sélectionné',
      );
    }

    return this.prisma.demande.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        priorite: dto.priorite,
        departementId: dto.departementId,
        categorieId: dto.categorieId,
        demandeurId,
        metadata: dto.metadata,
      },
    });
  }
}