import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface Notification {
  id: number;
  utilisateurId: number;
  message: string;
  lien: string | null;
  lu: boolean;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private socket: Socket | null = null;

  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);

  connect(): void {
    if (this.socket?.connected) return;

    if (!this.authService.getToken()) return;

    // environment.apiUrl peut se terminer par exemple par
    // http://localhost:3000 ou http://localhost:3000/api — socket.io
    // se connecte à la racine du serveur, pas à un chemin REST, on
    // retire donc un éventuel suffixe /api.
    const socketUrl = environment.apiUrl.replace(/\/api\/?$/, '');

    this.socket = io(socketUrl, {
      // Une fonction (pas un objet statique) pour que chaque tentative de
      // connexion — y compris les reconnexions automatiques après un
      // redémarrage du serveur ou une longue période d'inactivité —
      // envoie le token actuel plutôt que de rejouer celui capturé au
      // premier appel de connect().
      auth: (cb) => cb({ token: this.authService.getToken() }),
      transports: ['websocket'],
    });

    this.socket.on('notification', (notif: Notification) => {
      this.notifications.update((list) => [notif, ...list]);
      this.unreadCount.update((count) => count + 1);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Erreur de connexion socket:', err.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  async loadInitial(): Promise<void> {
    try {
      const [list, unread] = await Promise.all([
        firstValueFrom(this.http.get<Notification[]>(`${environment.apiUrl}/notifications`)),
        firstValueFrom(
          this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`),
        ),
      ]);
      this.notifications.set(list);
      this.unreadCount.set(unread.count);
    } catch {
      // non bloquant
    }
  }

  async markAsRead(id: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}),
      );
      this.notifications.update((list) =>
        list.map((n) => (n.id === id ? { ...n, lu: true } : n)),
      );
      this.unreadCount.update((count) => Math.max(0, count - 1));
    } catch {
      // non bloquant
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}));
      this.notifications.update((list) => list.map((n) => ({ ...n, lu: true })));
      this.unreadCount.set(0);
    } catch {
      // non bloquant
    }
  }
}