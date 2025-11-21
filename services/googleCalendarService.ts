import { supabase } from '../lib/supabase';
import { ExternalEvent, Visit } from '../types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
];

export class GoogleCalendarService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async logSync(action: string, status: string, errorMessage?: string, eventId?: string) {
    try {
      await supabase.from('calendar_sync_log').insert({
        user_id: this.userId,
        action,
        status,
        error_message: errorMessage,
        event_id: eventId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleOAuthCallback(code: string): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          code,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          redirectUri: REDIRECT_URI
        })
      });

      if (!response.ok) {
        throw new Error('OAuth request failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'OAuth failed');
      }

      const expiryDate = new Date(Date.now() + (data.expiresIn * 1000)).toISOString();

      const { error } = await supabase.from('calendar_tokens').upsert({
        user_id: this.userId,
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        token_expiry: expiryDate,
        google_email: data.email,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

      if (error) throw error;

      await this.logSync('oauth', 'success');

      return { success: true, email: data.email };
    } catch (error) {
      await this.logSync('oauth', 'error', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'OAuth failed' };
    }
  }

  async getTokens() {
    const { data, error } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('No calendar token found. Please connect your Google Calendar.');
    }

    return data;
  }

  async updateTokenIfNeeded(newAccessToken: string | null) {
    if (newAccessToken) {
      const expiryDate = new Date(Date.now() + 3600000).toISOString();
      await supabase.from('calendar_tokens').update({
        access_token: newAccessToken,
        token_expiry: expiryDate,
        updated_at: new Date().toISOString()
      }).eq('user_id', this.userId);
    }
  }

  async fetchEvents(startDate: Date, endDate: Date): Promise<ExternalEvent[]> {
    try {
      const tokens = await this.getTokens();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'fetch',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Fetch failed');
      }

      await this.updateTokenIfNeeded(data.newAccessToken);

      const events: ExternalEvent[] = [];

      for (const event of data.events || []) {
        if (!event.start) continue;

        const startDateTime = event.start.dateTime || event.start.date;
        if (!startDateTime) continue;

        const eventDate = new Date(startDateTime);
        const dateStr = eventDate.toISOString().split('T')[0];
        const timeStr = event.start.dateTime
          ? eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          : 'All Day';

        events.push({
          id: event.id || '',
          title: event.summary || 'Untitled Event',
          date: dateStr,
          time: timeStr,
          source: 'Google',
          isAllDay: !event.start.dateTime,
          isRecurring: !!event.recurringEventId,
          recurrenceRule: event.recurrence ? event.recurrence[0] : undefined
        });
      }

      await this.logSync('fetch', 'success');

      return events;
    } catch (error) {
      await this.logSync('fetch', 'error', error instanceof Error ? error.message : 'Fetch failed');
      throw error;
    }
  }

  async createEvent(visit: Visit, patientName: string, studyId: string, patientId: string): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      const tokens = await this.getTokens();

      const visitDate = new Date(visit.date);
      const timeMatch = visit.notes?.match(/Time: (\d{2}:\d{2})/);
      const visitTime = timeMatch ? timeMatch[1] : '09:00';

      const [hours, minutes] = visitTime.split(':');
      visitDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endDate = new Date(visitDate);
      endDate.setHours(endDate.getHours() + 1);

      const event = {
        summary: `${patientName} - ${visit.name}`,
        description: `CTMS Visit\nPatient: ${patientName}\nVisit Type: ${visit.name}\nStudy ID: ${studyId}\nPatient ID: ${patientId}\nNotes: ${visit.notes || 'None'}`,
        start: {
          dateTime: visitDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'create',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          event
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Create failed');
      }

      await this.updateTokenIfNeeded(data.newAccessToken);

      const googleEventId = data.eventId;

      if (googleEventId) {
        await supabase.from('calendar_event_mappings').insert({
          user_id: this.userId,
          ctms_visit_id: visit.id,
          google_event_id: googleEventId,
          study_id: studyId,
          patient_id: patientId,
          sync_direction: 'ctms_to_google',
          last_synced: new Date().toISOString()
        });

        await this.logSync('create', 'success', undefined, googleEventId);

        return { success: true, eventId: googleEventId };
      }

      throw new Error('No event ID returned');
    } catch (error) {
      await this.logSync('create', 'error', error instanceof Error ? error.message : 'Create failed', visit.id);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create event' };
    }
  }

  async updateEvent(visit: Visit, patientName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: mapping } = await supabase
        .from('calendar_event_mappings')
        .select('google_event_id')
        .eq('user_id', this.userId)
        .eq('ctms_visit_id', visit.id)
        .maybeSingle();

      if (!mapping?.google_event_id) {
        return { success: false, error: 'No mapping found' };
      }

      const tokens = await this.getTokens();

      const visitDate = new Date(visit.date);
      const timeMatch = visit.notes?.match(/Time: (\d{2}:\d{2})/);
      const visitTime = timeMatch ? timeMatch[1] : '09:00';

      const [hours, minutes] = visitTime.split(':');
      visitDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endDate = new Date(visitDate);
      endDate.setHours(endDate.getHours() + 1);

      const event = {
        summary: `${patientName} - ${visit.name}`,
        start: {
          dateTime: visitDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'update',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          eventId: mapping.google_event_id,
          event
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Update failed');
      }

      await this.updateTokenIfNeeded(data.newAccessToken);

      await supabase.from('calendar_event_mappings')
        .update({ last_synced: new Date().toISOString() })
        .eq('google_event_id', mapping.google_event_id);

      await this.logSync('update', 'success', undefined, mapping.google_event_id);

      return { success: true };
    } catch (error) {
      await this.logSync('update', 'error', error instanceof Error ? error.message : 'Update failed', visit.id);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update event' };
    }
  }

  async deleteEvent(visitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: mapping } = await supabase
        .from('calendar_event_mappings')
        .select('google_event_id')
        .eq('user_id', this.userId)
        .eq('ctms_visit_id', visitId)
        .maybeSingle();

      if (!mapping?.google_event_id) {
        return { success: true };
      }

      const tokens = await this.getTokens();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'delete',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          eventId: mapping.google_event_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      await this.updateTokenIfNeeded(data.newAccessToken);

      await supabase.from('calendar_event_mappings')
        .delete()
        .eq('google_event_id', mapping.google_event_id);

      await this.logSync('delete', 'success', undefined, mapping.google_event_id);

      return { success: true };
    } catch (error) {
      await this.logSync('delete', 'error', error instanceof Error ? error.message : 'Delete failed', visitId);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete event' };
    }
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase.from('calendar_tokens').delete().eq('user_id', this.userId);
      await supabase.from('calendar_event_mappings').delete().eq('user_id', this.userId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Disconnect failed' };
    }
  }

  async getConnectionStatus(): Promise<{ connected: boolean; email?: string; lastSynced?: string }> {
    try {
      const { data } = await supabase
        .from('calendar_tokens')
        .select('google_email, updated_at')
        .eq('user_id', this.userId)
        .maybeSingle();

      if (!data) {
        return { connected: false };
      }

      return {
        connected: true,
        email: data.google_email,
        lastSynced: new Date(data.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (error) {
      return { connected: false };
    }
  }
}
