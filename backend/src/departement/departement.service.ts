import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartementDto } from './dto/create-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';

@Injectable()
export class DepartementService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDepartementDto) {
    const existing = await this.prisma.departement.findUnique({
      where: { nom: dto.nom },
    });

    if (existing) {
      throw new ConflictException('Un département avec ce nom existe déjà');
    }

    return this.prisma.departement.create({
      data: { nom: dto.nom },
    });
  }

  async findAll() {
    return this.prisma.departement.findMany({
      orderBy: { nom: 'asc' },
    });
  }

  async findOne(id: number) {
    const departement = await this.prisma.departement.findUnique({
      where: { id },
    });

    if (!departement) {
      throw new NotFoundException('Département non trouvé');
    }

    return departement;
  }

  async update(id: number, dto: UpdateDepartementDto) {
    await this.findOne(id);

    return this.prisma.departement.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const categoriesCount = await this.prisma.categorie.count({
      where: { departementId: id },
    });

    if (categoriesCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer ce département : des catégories y sont rattachées',
      );
    }

    const demandesCount = await this.prisma.demande.count({
      where: { departementId: id },
    });

    if (demandesCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer ce département : des demandes y sont rattachées',
      );
    }

    return this.prisma.departement.delete({
      where: { id },
    });
  }
}