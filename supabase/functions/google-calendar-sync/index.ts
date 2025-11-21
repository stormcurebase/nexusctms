import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, accessToken, refreshToken, clientId, clientSecret, ...params } = await req.json();

    let token = accessToken;

    if (action === "fetch") {
      const { startDate, endDate } = params;

      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.append("timeMin", startDate);
      url.searchParams.append("timeMax", endDate);
      url.searchParams.append("singleEvents", "true");
      url.searchParams.append("orderBy", "startTime");

      let response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken(refreshToken, clientId, clientSecret);
        response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${await response.text()}`);
      }

      const data = await response.json();
      const events = data.items || [];

      return new Response(
        JSON.stringify({ success: true, events, newAccessToken: token !== accessToken ? token : null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const { event } = params;

      let response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken(refreshToken, clientId, clientSecret);
        response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to create event: ${await response.text()}`);
      }

      const createdEvent = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          eventId: createdEvent.id,
          newAccessToken: token !== accessToken ? token : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      const { eventId, event } = params;

      let response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken(refreshToken, clientId, clientSecret);
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to update event: ${await response.text()}`);
      }

      return new Response(
        JSON.stringify({ success: true, newAccessToken: token !== accessToken ? token : null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { eventId } = params;

      let response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken(refreshToken, clientId, clientSecret);
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete event: ${await response.text()}`);
      }

      return new Response(
        JSON.stringify({ success: true, newAccessToken: token !== accessToken ? token : null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Operation failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});