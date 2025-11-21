import { google } from 'googleapis';
import { supabase } from '../lib/supabase';
import { ExternalEvent, Visit, EventMapping, SyncLogEntry } from '../types';
import { RRule } from 'rrule';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback';

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

  async logSync(action: SyncLogEntry['action'], status: SyncLogEntry['status'], errorMessage?: string, eventId?: string) {
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
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  async handleOAuthCallback(code: string): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
      );

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Missing tokens from OAuth response');
      }

      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email || '';

      const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString();

      const { error } = await supabase.from('calendar_tokens').upsert({
        user_id: this.userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiryDate,
        google_email: email,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

      if (error) throw error;

      await this.logSync('oauth', 'success');

      return { success: true, email };
    } catch (error) {
      await this.logSync('oauth', 'error', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'OAuth failed' };
    }
  }

  async getAuthClient() {
    const { data, error } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('No calendar token found. Please connect your Google Calendar.');
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    const tokenExpiry = new Date(data.token_expiry);
    const now = new Date();

    if (now >= new Date(tokenExpiry.getTime() - 5 * 60 * 1000)) {
      oauth2Client.setCredentials({
        refresh_token: data.refresh_token
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        const newExpiry = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString();

        await supabase.from('calendar_tokens').update({
          access_token: credentials.access_token,
          token_expiry: newExpiry,
          updated_at: new Date().toISOString()
        }).eq('user_id', this.userId);
      }
    } else {
      oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: tokenExpiry.getTime()
      });
    }

    return oauth2Client;
  }

  async fetchEvents(startDate: Date, endDate: Date): Promise<ExternalEvent[]> {
    try {
      const auth = await this.getAuthClient();
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events: ExternalEvent[] = [];

      for (const event of response.data.items || []) {
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
      const auth = await this.getAuthClient();
      const calendar = google.calendar({ version: 'v3', auth });

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

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });

      const googleEventId = response.data.id;

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

      throw new Error('No event ID returned from Google');
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

      const auth = await this.getAuthClient();
      const calendar = google.calendar({ version: 'v3', auth });

      const visitDate = new Date(visit.date);
      const timeMatch = visit.notes?.match(/Time: (\d{2}:\d{2})/);
      const visitTime = timeMatch ? timeMatch[1] : '09:00';

      const [hours, minutes] = visitTime.split(':');
      visitDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endDate = new Date(visitDate);
      endDate.setHours(endDate.getHours() + 1);

      await calendar.events.patch({
        calendarId: 'primary',
        eventId: mapping.google_event_id,
        requestBody: {
          summary: `${patientName} - ${visit.name}`,
          start: {
            dateTime: visitDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      });

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

      const auth = await this.getAuthClient();
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: mapping.google_event_id
      });

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
