import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';

function createMockPrisma() {
  return {
    utilisateur: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createMockJwt() {
  return { sign: jest.fn(() => 'signed.jwt.token') };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let jwtService: ReturnType<typeof createMockJwt>;

  beforeEach(() => {
    prisma = createMockPrisma();
    jwtService = createMockJwt();
    service = new AuthService(prisma as any, jwtService as any);
  });

  describe('login', () => {
    it("rejette un email inconnu", async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@test.com', motDePasse: 'x' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un compte désactivé', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        motDePasse: await bcrypt.hash('secret', 10),
        actif: false,
        role: Role.EMPLOYE,
        departementId: null,
      });
      await expect(
        service.login({ email: 'a@test.com', motDePasse: 'secret' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un mauvais mot de passe', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        motDePasse: await bcrypt.hash('secret', 10),
        actif: true,
        role: Role.EMPLOYE,
        departementId: null,
      });
      await expect(
        service.login({ email: 'a@test.com', motDePasse: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('retourne un token pour des identifiants valides', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@test.com',
        motDePasse: await bcrypt.hash('secret', 10),
        actif: true,
        role: Role.ADMIN,
        departementId: null,
      });

      const result = await service.login({ email: 'a@test.com', motDePasse: 'secret' } as any);

      expect(result).toEqual({ token: 'signed.jwt.token' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 1, role: Role.ADMIN }),
      );
    });
  });

  describe('createUser', () => {
    it('rejette un email déjà utilisé', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue({ id: 1 });
      await expect(
        service.createUser({ email: 'a@test.com', motDePasse: 'x' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('hache le mot de passe et ne le renvoie jamais', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(null);
      prisma.utilisateur.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 1, ...data }),
      );

      const result = await service.createUser({
        nom: 'Doe',
        prenom: 'John',
        email: 'a@test.com',
        motDePasse: 'plaintext',
        role: Role.EMPLOYE,
        departementId: null,
      } as any);

      expect(result).not.toHaveProperty('motDePasse');
      const createdData = prisma.utilisateur.create.mock.calls[0][0].data;
      expect(createdData.motDePasse).not.toBe('plaintext');
      expect(await bcrypt.compare('plaintext', createdData.motDePasse)).toBe(true);
    });
  });

  describe('changePassword', () => {
    it("lève NotFoundException si l'utilisateur n'existe pas", async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(null);
      await expect(service.changePassword(1, 'old', 'new')).rejects.toThrow(NotFoundException);
    });

    it("rejette si l'ancien mot de passe est incorrect", async () => {
      prisma.utilisateur.findUnique.mockResolvedValue({
        id: 1,
        motDePasse: await bcrypt.hash('correct', 10),
      });
      await expect(service.changePassword(1, 'wrong', 'new')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('met à jour avec un nouveau mot de passe haché', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue({
        id: 1,
        motDePasse: await bcrypt.hash('correct', 10),
      });

      await service.changePassword(1, 'correct', 'nouveauMdp');

      const updateData = prisma.utilisateur.update.mock.calls[0][0].data;
      expect(await bcrypt.compare('nouveauMdp', updateData.motDePasse)).toBe(true);
    });
  });
});
