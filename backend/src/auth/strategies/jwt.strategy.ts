import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
  }

  // Le payload du token ne suffit pas : il peut dater de plusieurs heures
  // (JWT_ACCESS_EXPIRES_IN) et rester valide après qu'un admin ait désactivé
  // le compte ou changé son rôle/département. On revérifie donc l'état actuel
  // en base à chaque requête authentifiée, et on renvoie les valeurs à jour
  // (pas celles, potentiellement périmées, du payload) pour que role/departement
  // guards voient l'état courant sans attendre l'expiration du token.
  async validate(payload: any) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, departementId: true, actif: true },
    });

    if (!user || !user.actif) {
      throw new UnauthorizedException('Compte désactivé ou introuvable');
    }

    return {
      userId: user.id,
      role: user.role,
      departementId: user.departementId,
    };
  }
}