import { ConflictException, Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);

    const user = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        motDePasse: hashedPassword,
        role: dto.role,
        departementId: dto.departementId,
      },
    });

    const { motDePasse, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.actif) {
      throw new UnauthorizedException('Compte désactivé');
    } 

    const passwordValid = await bcrypt.compare(dto.motDePasse, user.motDePasse);

    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      departementId: user.departementId,
    };

    const token = this.jwtService.sign(payload);

    return { token };
  }

  async getUsers() {
  return this.prisma.utilisateur.findMany({
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      actif: true,
      departementId: true,
      departement: { select: { id: true, nom: true } },
    },
    orderBy: { nom: 'asc' },
  });
}

async updateUser(id: number, dto: UpdateUserDto) {
  const user = await this.prisma.utilisateur.findUnique({ where: { id } });
  if (!user) throw new NotFoundException('Utilisateur introuvable');

  return this.prisma.utilisateur.update({
    where: { id },
    data: dto,
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      actif: true,
      departementId: true,
      departement: { select: { id: true, nom: true } },
    },
  });
}

async updateStatutUser(id: number, actif: boolean) {
  const user = await this.prisma.utilisateur.findUnique({ where: { id } });
  if (!user) throw new NotFoundException('Utilisateur introuvable');

  return this.prisma.utilisateur.update({
    where: { id },
    data: { actif },
    select: { id: true, nom: true, prenom: true, email: true, actif: true },
  });
}

async getMe(userId: number) {
  const user = await this.prisma.utilisateur.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      actif: true,
      departementId: true,
      departement: { select: { id: true, nom: true } },
    },
  });

  if (!user) {
    throw new NotFoundException('Utilisateur introuvable');
  }

  return user;
}

async changePassword(userId: number, ancienMotDePasse: string, nouveauMotDePasse: string) {
  const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundException('Utilisateur introuvable');
  }

  const valid = await bcrypt.compare(ancienMotDePasse, user.motDePasse);
  if (!valid) {
    throw new UnauthorizedException('Mot de passe actuel incorrect');
  }

  const hashed = await bcrypt.hash(nouveauMotDePasse, 10);
  await this.prisma.utilisateur.update({
    where: { id: userId },
    data: { motDePasse: hashed },
  });

  return { message: 'Mot de passe mis à jour avec succès' };
}


}