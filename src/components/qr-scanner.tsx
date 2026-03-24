'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export function QRScanner({ onScan, onError, enabled = true }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);

  const startScanner = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setError(null);
      
      // Check camera availability first
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setHasCamera(false);
        setError('No camera found on this device');
        return;
      }

      // Stop existing scanner if any
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING) {
            await scannerRef.current.stop();
          }
        } catch (e) {
          // Ignore errors when stopping
        }
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        devices[0].id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
        },
        () => {
          // Error callback (ignore QR parse errors)
        }
      );

      setIsScanning(true);
      setHasCamera(true);
    } catch (err) {
      console.error('Scanner error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [enabled, onScan, onError]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        // Ignore errors when stopping
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [enabled, startScanner, stopScanner]);

  const handleRestart = () => {
    stopScanner().then(() => {
      startScanner();
    });
  };

  if (!hasCamera) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-lg border border-zinc-800">
        <CameraOff className="w-16 h-16 text-zinc-500 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Camera Available</h3>
        <p className="text-zinc-400 text-center mb-4">
          This device doesn&apos;t have a camera or camera access was denied.
        </p>
        <p className="text-zinc-500 text-sm">
          Use manual entry below to check in guests.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-sm mx-auto">
        {/* Scanner viewport */}
        <div 
          id="qr-reader" 
          className="w-full rounded-lg overflow-hidden bg-black"
          style={{ minHeight: '300px' }}
        />
        
        {/* Scanning indicator */}
        {isScanning && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white text-sm">Scanning...</span>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-950/50 px-4 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          onClick={handleRestart}
          disabled={!enabled}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Restart Scanner
        </Button>
      </div>
    </div>
  );
}
