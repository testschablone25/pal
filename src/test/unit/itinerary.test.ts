// Unit tests for PDF Itinerary Generation
// Nightclub Booking System - Phase 2.4

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatItineraryData, hasTimeOverlap, generateShareableLink, type ItineraryData } from '@/lib/itinerary';

// Mock jspdf - we'll test the formatItineraryData function directly
vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      text: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      rect: vi.fn(),
      line: vi.fn(),
      save: vi.fn(),
      addPage: vi.fn(),
      setPage: vi.fn(),
      getNumberOfPages: vi.fn(() => 1),
      internal: {
        pageSize: { getWidth: () => 210, getHeight: () => 297 }
      },
      output: vi.fn(() => new ArrayBuffer(0))
    }))
  };
});

describe('Itinerary PDF Generation', () => {
  const mockEventData: ItineraryData = {
    event: {
      id: 'test-event-id',
      name: 'Saturday Night Techno',
      date: '2026-04-15',
      door_time: '22:00:00',
      venue: {
        name: 'Techno Club Hamburg',
        address: 'Reeperbahn 1, 20354 Hamburg'
      }
    },
    performances: [
      {
        id: 'perf-1',
        artist: {
          name: 'DJ Test',
          city: 'Berlin',
          contact_email: 'test@example.com'
        },
        start_time: '23:00:00',
        end_time: '00:30:00',
        stage: 'main',
        itinerary: {
          performance_id: 'perf-1',
          arrival_time: '20:00:00',
          hotel: 'Hotel Hamburg Central',
          notes: 'Soundcheck at 21:00'
        }
      },
      {
        id: 'perf-2',
        artist: {
          name: 'Live Act',
          city: 'Munich',
          contact_email: 'live@example.com'
        },
        start_time: '01:00:00',
        end_time: '02:30:00',
        stage: 'main',
        itinerary: {
          performance_id: 'perf-2',
          arrival_time: '23:30:00',
          hotel: 'Hotel Hamburg Central',
          notes: 'Back-to-back set'
        }
      }
    ]
  };

  describe('formatItineraryData', () => {
    it('formats event data correctly', () => {
      const formatted = formatItineraryData(mockEventData);
      
      expect(formatted.eventName).toBe('Saturday Night Techno');
      expect(formatted.eventDate).toBe('2026-04-15');
      expect(formatted.venueName).toBe('Techno Club Hamburg');
    });

    it('includes all performances', () => {
      const formatted = formatItineraryData(mockEventData);
      
      expect(formatted.performances).toHaveLength(2);
      expect(formatted.performances[0].artistName).toBe('DJ Test');
      expect(formatted.performances[1].artistName).toBe('Live Act');
    });

    it('merges itinerary with performances', () => {
      const formatted = formatItineraryData(mockEventData);
      
      const firstPerf = formatted.performances[0];
      expect(firstPerf.arrivalTime).toBe('20:00:00');
      expect(firstPerf.hotel).toBe('Hotel Hamburg Central');
      expect(firstPerf.notes).toBe('Soundcheck at 21:00');
    });
  });

  describe('Itinerary Shareable Link', () => {
    it('generates correct shareable link format', () => {
      const eventId = 'test-event-id';
      const shareableLink = generateShareableLink(eventId);
      
      expect(shareableLink).toContain(eventId);
    });
  });
});
