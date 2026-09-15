import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { utilisateur: { findUnique: jest.Mock } };

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    prisma = { utilisateur: { findUnique: jest.fn() } };
    strategy = new JwtStrategy(prisma as unknown as PrismaService);
  });

  it('renvoie les infos utilisateur à jour depuis la base quand le compte est actif', async () => {
    prisma.utilisateur.findUnique.mockResolvedValue({
      id: 1,
      role: 'MANAGER',
      departementId: 2,
      actif: true,
    });

    const result = await strategy.validate({
      sub: 1,
      role: 'EMPLOYE',
      departementId: 9,
    });

    expect(result).toEqual({ userId: 1, role: 'MANAGER', departementId: 2 });
  });

  it('rejette un token dont le compte a été désactivé entretemps', async () => {
    prisma.utilisateur.findUnique.mockResolvedValue({
      id: 1,
      role: 'EMPLOYE',
      departementId: null,
      actif: false,
    });

    await expect(strategy.validate({ sub: 1 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejette un token dont l'utilisateur n'existe plus", async () => {
    prisma.utilisateur.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 999 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});