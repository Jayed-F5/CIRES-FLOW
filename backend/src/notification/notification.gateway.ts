import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<number, Set<string>>();

  constructor(private jwtService: JwtService) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;

    if (!token) {
      this.logger.warn(`Connexion WebSocket refusée (pas de token) : ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token as string, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      const userId = payload.sub;
      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Utilisateur #${userId} connecté (socket ${client.id})`);
    } catch (error) {
      this.logger.warn(`Connexion WebSocket refusée (token invalide) : ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Socket déconnecté : ${client.id}`);
  }

  sendToUser(userId: number, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) {
      return;
    }

    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, data);
    }
  }
}