'use client';

import { useEffect, useState } from 'react';
import { Check, X, User, Mail, Phone, Ticket, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GuestInfo {
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

interface GuestInfoPopupProps {
  guest: GuestInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn?: () => void;
  isCheckInSuccess?: boolean;
  isCheckInError?: boolean;
  errorMessage?: string;
}

export function GuestInfoPopup({
  guest,
  isOpen,
  onClose,
  isCheckInSuccess,
  isCheckInError,
  errorMessage,
}: GuestInfoPopupProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'presale':
        return 'bg-blue-500';
      case 'guestlist':
        return 'bg-purple-500';
      case 'walkin':
        return 'bg-orange-500';
      default:
        return 'bg-zinc-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-500';
      case 'checked_out':
        return 'bg-yellow-500';
      case 'pending':
        return 'bg-zinc-500';
      default:
        return 'bg-zinc-500';
    }
  };

  if (!guest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Guest Information
          </DialogTitle>
        </DialogHeader>

        {/* Success state */}
        {isCheckInSuccess && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-green-500 mb-2">Check-in Successful!</h3>
            <p className="text-zinc-300 text-center">Welcome, {guest.guest_name}!</p>
          </div>
        )}

        {/* Error state */}
        {isCheckInError && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-red-500 mb-2">Check-in Failed</h3>
            <p className="text-zinc-300 text-center">{errorMessage || 'Please try again'}</p>
          </div>
        )}

        {/* Guest details */}
        {!isCheckInSuccess && !isCheckInError && (
          <div className="space-y-4">
            {/* Name and status */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{guest.guest_name}</h3>
              <div className="flex gap-2">
                <Badge className={getCategoryColor(guest.category)}>
                  {guest.category}
                </Badge>
                <Badge className={getStatusColor(guest.status)}>
                  {guest.status}
                </Badge>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2 bg-zinc-800/50 p-4 rounded-lg">
              {guest.guest_email && (
                <div className="flex items-center gap-2 text-zinc-300">
                  <Mail className="w-4 h-4" />
                  <span>{guest.guest_email}</span>
                </div>
              )}
              {guest.guest_phone && (
                <div className="flex items-center gap-2 text-zinc-300">
                  <Phone className="w-4 h-4" />
                  <span>{guest.guest_phone}</span>
                </div>
              )}
            </div>

            {/* Additional info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 p-3 rounded-lg">
                <p className="text-zinc-400 text-xs mb-1">Guest List</p>
                <p className="text-white font-medium">{guest.guest_list?.name || 'N/A'}</p>
              </div>
              <div className="bg-zinc-800/50 p-3 rounded-lg">
                <p className="text-zinc-400 text-xs mb-1">Plus Ones</p>
                <p className="text-white font-medium">{guest.plus_ones}</p>
              </div>
            </div>

            {/* Check-in time */}
            {guest.checked_in_at && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="w-4 h-4" />
                <span>
                  Checked in at {new Date(guest.checked_in_at).toLocaleTimeString('de-DE')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            {isCheckInSuccess || isCheckInError ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
