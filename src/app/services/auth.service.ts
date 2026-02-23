import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { JwtUtil, JwtPayload } from '../utils/jwt.util';

export interface LoginResponse {
  token: string;
  tokenType?: string; // "Bearer"
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient) {}

  login(email: string, password: string, rememberMe: boolean): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          const token = res?.token;
          if (!token) throw new Error('No token returned from backend');

          // Validate token before storing
          if (!JwtUtil.isValidToken(token)) {
            throw new Error('Invalid token received from backend');
          }

          // Always use localStorage for token persistence across page reloads
          // This prevents logout on hot reload during development
          localStorage.setItem('token', token);
          localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
          
          // Clear sessionStorage to avoid confusion
          sessionStorage.removeItem('token');
          
          // Remove sensitive data from storage - extract from JWT when needed
          localStorage.removeItem('userId');
          localStorage.removeItem('email');
          localStorage.removeItem('role');
        })
      );
  }

  // backend expects ONLY {email,password}
  registerOwner(fullName: string, email: string, phone: string | undefined, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, { fullName, email, phone, password });
  }

  getToken(): string | null {
    // Always check localStorage first (primary storage)
    // Fallback to sessionStorage for legacy tokens
    return localStorage.getItem('token') ?? sessionStorage.getItem('token');
  }

  // Extract user data from JWT token instead of storage
  getCurrentUser(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    
    return JwtUtil.parseToken(token);
  }

  getUserId(): string | null {
    const token = this.getToken();
    return token ? JwtUtil.extractUserId(token) : null;
  }

  getEmail(): string | null {
    const token = this.getToken();
    return token ? JwtUtil.extractEmail(token) : null;
  }

  getRole(): string | null {
    const token = this.getToken();
    return token ? JwtUtil.extractRole(token) : null;
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    return token ? JwtUtil.isTokenExpired(token) : true;
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    return token ? JwtUtil.isValidToken(token) : false;
  }

  willTokenExpireSoon(minutes: number = 5): boolean {
    const token = this.getToken();
    return token ? JwtUtil.willExpireWithin(token, minutes) : true;
  }

  logout() {
    localStorage.clear();
    sessionStorage.clear();
  }

  // Force clear invalid tokens after JWT secret change
  clearInvalidTokens() {
    console.log('Clearing potentially invalid tokens...');
    this.logout();
  }
}
