import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function createContext(user: { role: Role } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  function createGuard(requiredRoles: Role[] | undefined) {
    const reflector = { getAllAndOverride: jest.fn(() => requiredRoles) } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it("autorise l'accès si aucun rôle n'est requis sur la route", () => {
    const guard = createGuard(undefined);
    expect(guard.canActivate(createContext(undefined))).toBe(true);
  });

  it("autorise l'accès si l'utilisateur a le rôle requis", () => {
    const guard = createGuard([Role.ADMIN]);
    expect(guard.canActivate(createContext({ role: Role.ADMIN }))).toBe(true);
  });

  it("refuse l'accès si l'utilisateur n'a pas le rôle requis", () => {
    const guard = createGuard([Role.ADMIN]);
    expect(() => guard.canActivate(createContext({ role: Role.EMPLOYE }))).toThrow(
      ForbiddenException,
    );
  });

  it("refuse l'accès si aucun utilisateur n'est présent sur la requête", () => {
    const guard = createGuard([Role.ADMIN]);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
  });

  it('accepte un utilisateur dont le rôle fait partie de la liste autorisée', () => {
    const guard = createGuard([Role.AGENT, Role.MANAGER, Role.ADMIN]);
    expect(guard.canActivate(createContext({ role: Role.MANAGER }))).toBe(true);
  });
});
