// ─── OpenGravity — Tool: get_current_time ───────────────────────
// Returns the current date and time in a human-readable format.

import type { Tool } from "./registry.js";

export const getCurrentTime: Tool = {
  definition: {
    type: "function",
    function: {
      name: "get_current_time",
      description:
        "Get the current date and time. Use this when the user asks about the current time, date, or when you need temporal context.",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description:
              'IANA timezone string (e.g., "America/New_York", "Europe/Madrid"). Defaults to system timezone if not specified.',
          },
        },
        required: [],
      },
    },
  },

  execute: async (args: Record<string, unknown>): Promise<string> => {
    const timezone = (args.timezone as string) || undefined;

    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "long",
      };

      if (timezone) {
        options.timeZone = timezone;
      }

      const formatted = new Intl.DateTimeFormat("en-US", options).format(now);
      const iso = now.toISOString();

      return JSON.stringify({
        formatted,
        iso,
        timestamp: now.getTime(),
        timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      return JSON.stringify({
        error: `Invalid timezone: ${timezone}`,
      });
    }
  },
};
