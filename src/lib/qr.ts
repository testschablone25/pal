import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Generate a unique QR token
export function generateQRToken(): string {
  return uuidv4();
}

// Generate QR code as data URL (base64)
export async function generateQRDataURL(token: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Generate QR code as SVG string
export async function generateQRSVG(token: string): Promise<string> {
  try {
    const qrSvg = await QRCode.toString(token, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrSvg;
  } catch (error) {
    console.error('Error generating QR SVG:', error);
    throw new Error('Failed to generate QR SVG');
  }
}

// Validate QR token format (UUID)
export function isValidQRToken(token: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(token);
}

// Generate token with expiration (24 hours default)
export function generateTokenWithExpiry(hours: number = 24): {
  token: string;
  expiresAt: Date;
} {
  const token = generateQRToken();
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return { token, expiresAt };
}

// Check if token is expired
export function isTokenExpired(expiresAt: Date | string): boolean {
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiryDate < new Date();
}
