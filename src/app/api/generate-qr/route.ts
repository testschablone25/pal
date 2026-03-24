import { NextRequest, NextResponse } from 'next/server';
import { generateQRDataURL } from '@/lib/qr';

// POST /api/generate-qr - Generate QR code data URL for a token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'token is required' },
        { status: 400 }
      );
    }

    const dataUrl = await generateQRDataURL(token);

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error('Error generating QR:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
