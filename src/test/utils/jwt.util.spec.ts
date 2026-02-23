import { JwtUtil, JwtPayload } from '../../app/utils/jwt.util';

describe('JwtUtil', () => {
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcklkIjoiMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5MDEyIiwicm9sZSI6Ik9XTkVSIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDEwODE2MDB9.signature';

  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcklkIjoiMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5MDEyIiwicm9sZSI6Ik9XTkVSIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTUyMDF9.signature';

  const invalidToken = 'invalid.token.structure';

  describe('parseToken', () => {
    it('should parse valid token correctly', () => {
      const payload = JwtUtil.parseToken(validToken);
      expect(payload).toBeTruthy();
      expect(payload?.sub).toBe('test@example.com');
      expect(payload?.userId).toBe('12345678-1234-1234-1234-123456789012');
      expect(payload?.role).toBe('OWNER');
    });

    it('should return null for invalid token', () => {
      const payload = JwtUtil.parseToken(invalidToken);
      expect(payload).toBeNull();
    });

    it('should return null for malformed token', () => {
      const payload = JwtUtil.parseToken('not.a.jwt');
      expect(payload).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      // Mock current time to be before expiration
      const currentTime = Math.floor(Date.now() / 1000);
      spyOn(Date, 'now').and.returnValue(currentTime * 1000 - 3600000); // 1 hour ago
      
      expect(JwtUtil.isTokenExpired(validToken)).toBeFalse();
    });

    it('should return true for expired token', () => {
      expect(JwtUtil.isTokenExpired(expiredToken)).toBeTrue();
    });

    it('should return true for invalid token', () => {
      expect(JwtUtil.isTokenExpired(invalidToken)).toBeTrue();
    });
  });

  describe('extractUserId', () => {
    it('should extract user ID from valid token', () => {
      const userId = JwtUtil.extractUserId(validToken);
      expect(userId).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('should return null for invalid token', () => {
      const userId = JwtUtil.extractUserId(invalidToken);
      expect(userId).toBeNull();
    });
  });

  describe('extractEmail', () => {
    it('should extract email from valid token', () => {
      const email = JwtUtil.extractEmail(validToken);
      expect(email).toBe('test@example.com');
    });

    it('should return null for invalid token', () => {
      const email = JwtUtil.extractEmail(invalidToken);
      expect(email).toBeNull();
    });
  });

  describe('extractRole', () => {
    it('should extract role from valid token', () => {
      const role = JwtUtil.extractRole(validToken);
      expect(role).toBe('OWNER');
    });

    it('should return null for invalid token', () => {
      const role = JwtUtil.extractRole(invalidToken);
      expect(role).toBeNull();
    });
  });

  describe('isValidToken', () => {
    it('should return true for valid token', () => {
      // Mock current time to be before expiration
      const currentTime = Math.floor(Date.now() / 1000);
      spyOn(Date, 'now').and.returnValue(currentTime * 1000 - 3600000); // 1 hour ago
      
      expect(JwtUtil.isValidToken(validToken)).toBeTrue();
    });

    it('should return false for expired token', () => {
      expect(JwtUtil.isValidToken(expiredToken)).toBeFalse();
    });

    it('should return false for invalid token', () => {
      expect(JwtUtil.isValidToken(invalidToken)).toBeFalse();
    });

    it('should return false for null token', () => {
      expect(JwtUtil.isValidToken(null as any)).toBeFalse();
    });

    it('should return false for empty token', () => {
      expect(JwtUtil.isValidToken('')).toBeFalse();
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return correct time for valid token', () => {
      // Mock current time to be 1 hour before expiration
      const expirationTime = 1641081600; // From token
      const currentTime = expirationTime - 3600; // 1 hour before
      spyOn(Date, 'now').and.returnValue(currentTime * 1000);
      
      const timeUntil = JwtUtil.getTimeUntilExpiration(validToken);
      expect(timeUntil).toBe(3600); // 1 hour in seconds
    });

    it('should return 0 for expired token', () => {
      expect(JwtUtil.getTimeUntilExpiration(expiredToken)).toBe(0);
    });
  });

  describe('willExpireWithin', () => {
    it('should return true if token expires within specified minutes', () => {
      // Mock current time to be 2 minutes before expiration
      const expirationTime = 1641081600; // From token
      const currentTime = expirationTime - 120; // 2 minutes before
      spyOn(Date, 'now').and.returnValue(currentTime * 1000);
      
      expect(JwtUtil.willExpireWithin(validToken, 5)).toBeTrue();
    });

    it('should return false if token does not expire within specified minutes', () => {
      // Mock current time to be 2 hours before expiration
      const expirationTime = 1641081600; // From token
      const currentTime = expirationTime - 7200; // 2 hours before
      spyOn(Date, 'now').and.returnValue(currentTime * 1000);
      
      expect(JwtUtil.willExpireWithin(validToken, 5)).toBeFalse();
    });
  });
});
