import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { QueryDemandeDto } from './dto/query-demande.dto';

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

  async findAll(query: QueryDemandeDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DemandeWhereInput = {};

    if (query.departementId) {
      where.departementId = query.departementId;
    }

    if (query.categorieId) {
      where.categorieId = query.categorieId;
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.priorite) {
      where.priorite = query.priorite;
    }

    if (query.search) {
      where.OR = [
        { titre: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [demandes, total] = await Promise.all([
      this.prisma.demande.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateCreation: 'desc' },
      }),
      this.prisma.demande.count({ where }),
    ]);

    return {
      data: demandes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}