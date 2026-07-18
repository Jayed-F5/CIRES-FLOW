import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Injectable()
export class CategorieService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategorieDto) {
    const departement = await this.prisma.departement.findUnique({
      where: { id: dto.departementId },
    });

    if (!departement) {
      throw new NotFoundException('Département introuvable');
    }

    return this.prisma.categorie.create({
      data: {
        nom: dto.nom,
        departementId: dto.departementId,
        delaiReponse: dto.delaiReponse,
        delaiResolution: dto.delaiResolution,
      },
    });
  }

  async findAll(departementId?: number) {
    return this.prisma.categorie.findMany({
      where: departementId ? { departementId } : undefined,
      orderBy: { nom: 'asc' },
    });
  }

  async findOne(id: number) {
    const categorie = await this.prisma.categorie.findUnique({
      where: { id },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie non trouvée');
    }

    return categorie;
  }

  async update(id: number, dto: UpdateCategorieDto) {
    await this.findOne(id);

    if (dto.departementId) {
      const departement = await this.prisma.departement.findUnique({
        where: { id: dto.departementId },
      });

      if (!departement) {
        throw new NotFoundException('Département introuvable');
      }
    }

    return this.prisma.categorie.update({
      where: { id },
      data: dto,
    });
  }
}