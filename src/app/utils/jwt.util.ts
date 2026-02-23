/**
 * JWT Utility for secure token parsing and validation
 * Prevents sensitive data exposure in browser storage
 */

export interface JwtPayload {
  sub: string; // email (subject)
  userId: string;
  role: string;
  iat: number; // issued at
  exp: number; // expiration
}

export class JwtUtil {
  /**
   * Parse JWT token safely
   * @param token JWT token string
   * @returns Parsed payload or null if invalid
   */
  static parseToken(token: string): JwtPayload | null {
    try {
      // Split token and decode payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT token structure');
        return null;
      }

      const payload = parts[1];
      const decoded = atob(this.base64UrlDecode(payload));
      return JSON.parse(decoded) as JwtPayload;
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param token JWT token string
   * @returns true if expired, false otherwise
   */
  static isTokenExpired(token: string): boolean {
    const payload = this.parseToken(token);
    if (!payload) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Extract user ID from token
   * @param token JWT token string
   * @returns User ID or null
   */
  static extractUserId(token: string): string | null {
    const payload = this.parseToken(token);
    return payload?.userId ?? null;
  }

  /**
   * Extract email from token
   * @param token JWT token string
   * @returns Email or null
   */
  static extractEmail(token: string): string | null {
    const payload = this.parseToken(token);
    return payload?.sub ?? null;
  }

  /**
   * Extract role from token
   * @param token JWT token string
   * @returns Role or null
   */
  static extractRole(token: string): string | null {
    const payload = this.parseToken(token);
    return payload?.role ?? null;
  }

  /**
   * Validate token structure and expiration
   * @param token JWT token string
   * @returns true if valid, false otherwise
   */
  static isValidToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const payload = this.parseToken(token);
    if (!payload) return false;

    // Check required fields
    if (!payload.sub || !payload.userId || !payload.role) {
      console.error('JWT token missing required claims');
      return false;
    }

    // Check expiration
    return !this.isTokenExpired(token);
  }

  /**
   * Base64 URL decode helper
   * @param str Base64 URL encoded string
   * @returns Decoded string
   */
  private static base64UrlDecode(str: string): string {
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Pad with proper number of '=' characters
    const padLength = (4 - str.length % 4) % 4;
    str += '='.repeat(padLength);
    
    return str;
  }

  /**
   * Get time until token expires (in seconds)
   * @param token JWT token string
   * @returns Seconds until expiration, 0 if expired
   */
  static getTimeUntilExpiration(token: string): number {
    const payload = this.parseToken(token);
    if (!payload) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Check if token will expire within specified minutes
   * @param token JWT token string
   * @param minutes Minutes to check
   * @returns true if expires within minutes
   */
  static willExpireWithin(token: string, minutes: number): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiration(token);
    const seconds = minutes * 60;
    return timeUntilExpiry <= seconds;
  }
}
