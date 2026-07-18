import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEtapeDto } from './dto/create-etape.dto';

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  async createEtape(dto: CreateEtapeDto) {
    const categorie = await this.prisma.categorie.findUnique({
      where: { id: dto.categorieId },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const existing = await this.prisma.workflowEtape.findUnique({
      where: {
        categorieId_ordre: {
          categorieId: dto.categorieId,
          ordre: dto.ordre,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Une étape avec l'ordre ${dto.ordre} existe déjà pour cette catégorie`,
      );
    }

    return this.prisma.workflowEtape.create({
      data: {
        categorieId: dto.categorieId,
        ordre: dto.ordre,
        roleApprobateur: dto.roleApprobateur,
      },
    });
  }

  async findByCategorie(categorieId: number) {
    return this.prisma.workflowEtape.findMany({
      where: { categorieId },
      orderBy: { ordre: 'asc' },
    });
  }
}