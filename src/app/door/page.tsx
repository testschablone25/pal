'use client';

import { useState, useCallback } from 'react';
import { QrCode, FormInput, LayoutDashboard, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRScanner } from '@/components/qr-scanner';
import { GuestEntryForm } from '@/components/guest-entry-form';
import { CapacityDashboard } from '@/components/capacity-dashboard';
import { GuestInfoPopup } from '@/components/guest-info-popup';

interface GuestData {
  id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  category: 'presale' | 'guestlist' | 'walkin';
  plus_ones: number;
  status: string;
  checked_in_at?: string;
  guest_list?: {
    name: string;
    event: {
      name: string;
      date: string;
    };
  };
}

// Demo event ID - in production, this would come from URL params or selection
const DEMO_EVENT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_GUEST_LIST_ID = '00000000-0000-0000-0000-000000000002';

export default function DoorScannerPage() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckInSuccess, setIsCheckInSuccess] = useState(false);
  const [isCheckInError, setIsCheckInError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Handle QR scan
  const handleScan = useCallback(async (decodedText: string) => {
    setIsCheckInLoading(true);
    setIsCheckInSuccess(false);
    setIsCheckInError(false);
    setErrorMessage('');

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_token: decodedText }),
      });

      const result = await response.json();

      if (response.ok) {
        setGuestData(result.data);
        setIsCheckInSuccess(true);
      } else if (response.status === 409) {
        // Already checked in
        setGuestData(result.entry);
        setErrorMessage(result.error);
        setIsCheckInError(true);
      } else if (response.status === 401) {
        // Invalid token
        setErrorMessage(result.error);
        setIsCheckInError(true);
      } else {
        throw new Error(result.error || 'Check-in failed');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      setIsCheckInError(true);
    } finally {
      setIsCheckInLoading(false);
      setIsPopupOpen(true);
    }
  }, []);

  // Handle manual entry
  const handleManualCheckIn = async () => {
    if (!manualToken.trim()) return;

    setIsManualLoading(true);
    await handleScan(manualToken.trim());
    setManualToken('');
    setIsManualLoading(false);
  };

  // Close popup and reset state
  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setGuestData(null);
    setIsCheckInSuccess(false);
    setIsCheckInError(false);
    setErrorMessage('');
  };

  // Handle guest entry success
  const handleGuestAdded = (entry: any) => {
    // Could show a success toast or update state
    console.log('Guest added:', entry);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Door Control</h1>
          <p className="text-zinc-400">Scan QR codes or manage guest entries</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
            <TabsTrigger value="scanner" className="gap-2">
              <QrCode className="w-4 h-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <FormInput className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">QR Code Scanner</CardTitle>
              </CardHeader>
              <CardContent>
                {isCheckInLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                    <p className="text-zinc-400">Processing check-in...</p>
                  </div>
                ) : (
                  <QRScanner 
                    onScan={handleScan}
                    enabled={activeTab === 'scanner'}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-6">
            {/* Manual QR token entry */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Manual Check-in</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-token" className="text-zinc-300">
                    Enter QR Token or Guest ID
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="manual-token"
                      placeholder="Enter token or scan manually"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                    />
                    <Button 
                      onClick={handleManualCheckIn}
                      disabled={isManualLoading || !manualToken.trim()}
                    >
                      {isManualLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Check In'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Walk-in form */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Add Walk-in Guest</CardTitle>
              </CardHeader>
              <CardContent>
                <GuestEntryForm
                  guestListId={DEMO_GUEST_LIST_ID}
                  onSuccess={handleGuestAdded}
                  onError={(error) => console.error('Error adding guest:', error)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <CapacityDashboard 
              eventId={DEMO_EVENT_ID}
              refreshInterval={10000}
            />
          </TabsContent>
        </Tabs>

        {/* Guest Info Popup */}
        <GuestInfoPopup
          guest={guestData}
          isOpen={isPopupOpen}
          onClose={handleClosePopup}
          isCheckInSuccess={isCheckInSuccess}
          isCheckInError={isCheckInError}
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}
