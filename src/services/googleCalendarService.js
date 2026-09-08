/**
 * Google Calendar API Integration Service for Kormiis HR
 * Supports:
 * 1. OAuth 2.0 Token Client via Google Identity Services (GIS)
 * 2. Creating calendar events on Leave Approval
 * 3. Fetching user primary calendar events for full Calendar Mirror View
 * 4. Fetching country-wise official Government / Public Holidays from Google
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '222964022668-oblup3icgeoal8ktdklfolg5fnub811g.apps.googleusercontent.com';
const GOOGLE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || '';

// Scopes required for full calendar read & event write
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

const STORAGE_KEY_TOKEN = 'kormiis_google_access_token';
const STORAGE_KEY_EXPIRES = 'kormiis_google_token_expires';
const STORAGE_KEY_USER = 'kormiis_google_user_email';

/**
 * List of supported countries with their official Google Public Holiday calendar IDs
 */
export const COUNTRY_HOLIDAY_CALENDARS = [
  { code: 'bd', name: 'Bangladesh', flag: '🇧🇩', calendarId: 'en.bd#holiday@group.v.calendar.google.com' },
  { code: 'us', name: 'United States', flag: '🇺🇸', calendarId: 'en.usa#holiday@group.v.calendar.google.com' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', calendarId: 'en.uk#holiday@group.v.calendar.google.com' },
  { code: 'in', name: 'India', flag: '🇮🇳', calendarId: 'en.indian#holiday@group.v.calendar.google.com' },
  { code: 'ae', name: 'United Arab Emirates', flag: '🇦🇪', calendarId: 'en.ae#holiday@group.v.calendar.google.com' },
  { code: 'sa', name: 'Saudi Arabia', flag: '🇸🇦', calendarId: 'en.sa#holiday@group.v.calendar.google.com' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', calendarId: 'en.canadian#holiday@group.v.calendar.google.com' },
  { code: 'au', name: 'Australia', flag: '🇦🇺', calendarId: 'en.australian#holiday@group.v.calendar.google.com' },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬', calendarId: 'en.singapore#holiday@group.v.calendar.google.com' },
  { code: 'my', name: 'Malaysia', flag: '🇲🇾', calendarId: 'en.malaysia#holiday@group.v.calendar.google.com' },
];

let tokenClient = null;
let gisLoadedPromise = null;

/**
 * Dynamically loads the Google Identity Services script
 */
export function loadGisScript() {
  if (gisLoadedPromise) return gisLoadedPromise;
  
  gisLoadedPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      resolve(window.google.accounts.oauth2);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google.accounts.oauth2);
      } else {
        reject(new Error('Google Identity Services library failed to initialize'));
      }
    };
    script.onerror = (err) => reject(new Error('Failed to load Google Identity Services: ' + err));
    document.head.appendChild(script);
  });

  return gisLoadedPromise;
}

/**
 * Check if the stored Google access token is still valid
 */
export function getValidAccessToken() {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEY_EXPIRES) || '0', 10);
    if (token && Date.now() < expiresAt) {
      return token;
    }
  } catch {
    // ignore local storage errors
  }
  return null;
}

/**
 * Returns connection state and email if connected
 */
export function getGoogleCalendarConnection() {
  const token = getValidAccessToken();
  const email = localStorage.getItem(STORAGE_KEY_USER) || null;
  return {
    isConnected: !!token,
    email: token ? email : null,
    token: token,
  };
}

/**
 * Connect Google Calendar with Interactive OAuth Consent
 */
export async function connectGoogleCalendar(userEmailHint = '') {
  await loadGisScript();

  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: CALENDAR_SCOPES,
        hint: userEmailHint || undefined,
        callback: async (resp) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          if (resp.access_token) {
            const expiresInMs = (parseInt(resp.expires_in, 10) || 3599) * 1000;
            localStorage.setItem(STORAGE_KEY_TOKEN, resp.access_token);
            localStorage.setItem(STORAGE_KEY_EXPIRES, String(Date.now() + expiresInMs));
            
            // Try fetching user email from token info or userinfo API
            try {
              const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
              });
              if (infoRes.ok) {
                const info = await infoRes.json();
                if (info.email) {
                  localStorage.setItem(STORAGE_KEY_USER, info.email);
                }
              }
            } catch {
              if (userEmailHint) localStorage.setItem(STORAGE_KEY_USER, userEmailHint);
            }

            resolve({
              accessToken: resp.access_token,
              email: localStorage.getItem(STORAGE_KEY_USER) || userEmailHint || 'Connected'
            });
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Disconnect Google Calendar
 */
export function disconnectGoogleCalendar() {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {
      // ignore revoke errors
    }
  }
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_EXPIRES);
  localStorage.removeItem(STORAGE_KEY_USER);
}

/**
 * Create a new event on the connected Google Calendar
 * Used directly when an Admin/Manager approves a leave request
 */
export async function createGoogleCalendarEvent({
  title,
  description = '',
  startDate, // 'YYYY-MM-DD' or ISO string
  endDate,   // 'YYYY-MM-DD' or ISO string
  allDay = true,
  location = '',
  attendees = []
}) {
  const token = getValidAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected. Please connect in Settings or Calendar.');
  }

  // Build event payload according to Google Calendar API v3
  const eventPayload = {
    summary: title,
    description: description,
    location: location,
  };

  if (allDay) {
    // For all-day events, Google API end.date is exclusive, so add 1 day if start == end
    const startStr = startDate.split('T')[0];
    let endStr = (endDate || startDate).split('T')[0];
    
    // Add 1 day to end date to ensure the final day is fully included
    try {
      const d = new Date(endStr);
      d.setDate(d.getDate() + 1);
      endStr = d.toISOString().split('T')[0];
    } catch {
      // fallback
    }

    eventPayload.start = { date: startStr };
    eventPayload.end = { date: endStr };
  } else {
    eventPayload.start = { dateTime: new Date(startDate).toISOString() };
    eventPayload.end = { dateTime: new Date(endDate || startDate).toISOString() };
  }

  if (attendees && attendees.length > 0) {
    eventPayload.attendees = attendees.map(email => ({ email }));
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventPayload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create calendar event (${response.status})`);
  }

  return await response.json();
}

/**
 * Fetch events from the primary calendar to mirror in Kormiis Calendar
 */
export async function fetchGoogleCalendarEvents({ timeMin, timeMax } = {}) {
  const token = getValidAccessToken();
  if (!token) return [];

  const now = new Date();
  const defaultMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const defaultMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', timeMin || defaultMin);
  url.searchParams.set('timeMax', timeMax || defaultMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401) {
        disconnectGoogleCalendar();
      }
      return [];
    }

    const data = await res.json();
    const items = data.items || [];

    // Map Google events to Kormiis Calendar event format
    return items.map(item => {
      const isAllDay = !!item.start?.date;
      const startDateStr = isAllDay ? item.start.date : (item.start.dateTime || '').split('T')[0];
      const timeStr = !isAllDay && item.start.dateTime 
        ? new Date(item.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

      return {
        id: `google-${item.id}`,
        googleId: item.id,
        title: item.summary || '(Untitled Google Event)',
        date: startDateStr,
        time: timeStr,
        type: 'google_mirror',
        description: item.description || '',
        location: item.location || '',
        htmlLink: item.htmlLink,
        isGoogleMirror: true,
        source: 'google'
      };
    });
  } catch (err) {
    console.error('Error fetching Google Calendar events:', err);
    return [];
  }
}

/**
 * Fetch official Government / Public Holidays for a specific country from Google Holiday Calendars
 */
export async function fetchCountryGovtHolidays(countryCode = 'bd', year = new Date().getFullYear()) {
  const countryObj = COUNTRY_HOLIDAY_CALENDARS.find(c => c.code.toLowerCase() === countryCode.toLowerCase()) || COUNTRY_HOLIDAY_CALENDARS[0];
  const calendarId = encodeURIComponent(countryObj.calendarId);

  const timeMin = new Date(year, 0, 1).toISOString();
  const timeMax = new Date(year, 11, 31, 23, 59, 59).toISOString();

  // If user has token, use Authorization header; otherwise try using API key if available
  const token = getValidAccessToken();
  const headers = {};
  let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=100`;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (GOOGLE_API_KEY) {
    url += `&key=${GOOGLE_API_KEY}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`Public holiday calendar fetch status ${res.status} for ${countryObj.name}`);
      return [];
    }

    const data = await res.json();
    const items = data.items || [];

    return items.map(item => ({
      id: `govt-holiday-${item.id || item.summary}-${item.start?.date}`,
      title: `${countryObj.flag} ${item.summary}`,
      date: item.start?.date || (item.start?.dateTime || '').split('T')[0],
      time: '',
      type: 'govt_holiday',
      countryCode: countryObj.code,
      countryName: countryObj.name,
      description: item.description || `Official Government / Public Holiday in ${countryObj.name}`,
      isGovtHoliday: true,
      source: 'google_holiday'
    }));
  } catch (err) {
    console.error(`Failed to fetch govt holidays for ${countryObj.name}:`, err);
    return [];
  }
}

/**
 * Fallback: Generate one-click URL to add an event directly to Google Calendar via browser
 */
export function generateGoogleCalendarUrl({
  title,
  description = '',
  startDate,
  endDate,
  location = ''
}) {
  const fmt = (dStr) => {
    if (!dStr) return '';
    return dStr.replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = fmt(new Date(startDate).toISOString());
  const end = fmt(new Date(endDate || startDate).toISOString());

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location: location,
    dates: `${start}/${end}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
