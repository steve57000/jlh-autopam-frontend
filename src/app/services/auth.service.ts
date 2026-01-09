import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

type UserRole = 'ADMIN' | 'CLIENT' | 'MANAGER' | null;

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string | string[]>;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterPayload {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  telephone: string;
  adresse?: string;
  immatriculation: string;
  consentRgpd: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private readonly isBrowser: boolean;
  private authStatus$ = new BehaviorSubject<boolean>(false);

  // ⚠️ Assure-toi que environment.apiBaseUrl est défini (ex: http://localhost:8080/api)
  private readonly apiBase = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.authStatus$.next(this.hasValidToken());
  }

  /** Login */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiBase}/auth/login`, { email, password }).pipe(
      tap(res => {
        if (res?.token && this.isBrowser) {
          localStorage.setItem(this.tokenKey, res.token);
          this.authStatus$.next(true);
        }
      })
    );
  }

  /** Register (inscription) */
  register(payload: RegisterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiBase}/auth/register`, payload);
  }

  logout(): void {
    if (this.isBrowser) localStorage.removeItem(this.tokenKey);
    this.authStatus$.next(false);
  }

  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.tokenKey) : null;
  }

  authState(): Observable<boolean> {
    return this.authStatus$.asObservable();
  }

  getUserRole(): UserRole {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const authorities: string[] = payload?.authorities ?? [];
      if (authorities.includes('ROLE_ADMIN') || authorities.includes('ROLE_ADMIN_PRINCIPAL') || authorities.includes('ADMIN')) {
        return 'ADMIN';
      }
      if (authorities.includes('ROLE_MANAGER') || authorities.includes('MANAGER')) return 'MANAGER';
      if (authorities.includes('ROLE_CLIENT') || authorities.includes('CLIENT')) return 'CLIENT';
      return null;
    } catch {
      return null;
    }
  }

  isAdminPrincipal(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const authorities: string[] = payload?.authorities ?? [];
      return authorities.includes('ROLE_ADMIN_PRINCIPAL') || authorities.includes('ADMIN_PRINCIPAL');
    } catch {
      return false;
    }
  }

  private hasValidToken(): boolean {
    if (!this.isBrowser) return false;
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.exp ? Date.now() < payload.exp * 1000 : true;
    } catch {
      return false;
    }
  }

  changePassword(payload: { oldPassword: string; newPassword: string; confirmPassword: string }) {
    return this.http.post<ApiResponse>(`${this.apiBase}/me/change-password`, payload, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  forgotPassword(email: string) {
    return this.http.post<ApiResponse>(`${this.apiBase}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string, confirmPassword: string) {
    return this.http.post<ApiResponse>(`${this.apiBase}/auth/reset-password`, {
      token, newPassword, confirmPassword
    });
  }

}
