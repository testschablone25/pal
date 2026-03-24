import { describe, it, expect } from 'vitest';
import {
  generateQRToken,
  generateQRDataURL,
  generateQRSVG,
  isValidQRToken,
  generateTokenWithExpiry,
  isTokenExpired,
} from './qr';

describe('QR Generation Utilities', () => {
  describe('generateQRToken', () => {
    it('should generate a valid UUID v4 token', () => {
      const token = generateQRToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(36); // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateQRToken());
      }
      expect(tokens.size).toBe(100); // All should be unique
    });
  });

  describe('generateQRDataURL', () => {
    it('should generate a valid data URL', async () => {
      const token = 'test-token-123';
      const dataUrl = await generateQRDataURL(token);
      
      expect(dataUrl).toBeDefined();
      expect(typeof dataUrl).toBe('string');
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should generate different data for different tokens', async () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      
      const dataUrl1 = await generateQRDataURL(token1);
      const dataUrl2 = await generateQRDataURL(token2);
      
      expect(dataUrl1).not.toBe(dataUrl2);
    });
  });

  describe('generateQRSVG', () => {
    it('should generate a valid SVG string', async () => {
      const token = 'test-token-123';
      const svg = await generateQRSVG(token);
      
      expect(svg).toBeDefined();
      expect(typeof svg).toBe('string');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.includes('</svg>')).toBe(true);
    });
  });

  describe('isValidQRToken', () => {
    it('should return true for valid UUID', () => {
      expect(isValidQRToken('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
      expect(isValidQRToken('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid tokens', () => {
      expect(isValidQRToken('invalid-token')).toBe(false);
      expect(isValidQRToken('')).toBe(false);
      expect(isValidQRToken('123')).toBe(false);
      expect(isValidQRToken('123e4567-e89b-12d3-a456-426614174000')).toBe(false); // Wrong version
    });
  });

  describe('generateTokenWithExpiry', () => {
    it('should generate token with default 24h expiry', () => {
      const { token, expiresAt } = generateTokenWithExpiry();
      
      expect(token).toBeDefined();
      expect(expiresAt).toBeInstanceOf(Date);
      
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3); // Within a few seconds
    });

    it('should generate token with custom expiry', () => {
      const { token, expiresAt } = generateTokenWithExpiry(48);
      
      expect(token).toBeDefined();
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      expect(expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      expect(isTokenExpired(expiredDate)).toBe(true);
    });

    it('should return false for valid tokens', () => {
      const validDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      expect(isTokenExpired(validDate)).toBe(false);
    });

    it('should handle string dates', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      expect(isTokenExpired(futureDate)).toBe(false);
      
      const pastDate = new Date(Date.now() - 1000).toISOString();
      expect(isTokenExpired(pastDate)).toBe(true);
    });
  });
});
