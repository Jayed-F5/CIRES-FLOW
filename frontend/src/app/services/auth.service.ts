import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export type Role = 'EMPLOYE' | 'AGENT' | 'MANAGER' | 'ADMIN';

export interface CurrentUser {
  id: number;
  role: Role;
  departementId: number | null;
  nom?: string;
  prenom?: string;
  email?: string;
}

interface JwtPayload {
  sub: number;
  role: Role;
  departementId: number | null;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'cires_token';

  private userSignal = signal<CurrentUser | null>(null);
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.restoreSession();
  }

  async login(email: string, motDePasse: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ token: string }>(`${environment.apiUrl}/auth/login`, {
        email,
        motDePasse,
      }),
    );

    localStorage.setItem(this.tokenKey, response.token);
    this.setUserFromToken(response.token);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private restoreSession(): void {
    const token = this.getToken();
    if (!token) return;

    if (this.isTokenExpired(token)) {
      localStorage.removeItem(this.tokenKey);
      return;
    }

    this.setUserFromToken(token);
  }

  private setUserFromToken(token: string): void {
    const payload = this.decodeToken(token);
    if (!payload) return;

    this.userSignal.set({
      id: payload.sub,
      role: payload.role,
      departementId: payload.departementId,
    });
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  }
}