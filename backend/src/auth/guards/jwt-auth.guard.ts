import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Votre session a expiré, veuillez vous reconnecter');
    }

    if (err || !user) {
      throw new UnauthorizedException('Token invalide ou manquant');
    }

    return user;
  }
}