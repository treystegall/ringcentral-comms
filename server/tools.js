import { rcDelete, rcGet, rcPost, rcPut } from "./client.js";
import {
  mapActiveCall,
  mapCallRecord,
  mapExtensionInfo,
  mapPhoneNumber,
  mapRingOutStatus,
  mapSmsMessage,
  mapSubscription,
  mapVoicemail,
  mapVoicemailDetail,
} from "./mappers.js";

/** @typedef {import("./errors.js").StructuredError} StructuredError */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name
 * @property {string} description
 * @property {{ type: "object"; properties: Record<string, unknown>; required?: string[] }} inputSchema
 * @property {(args: Record<string, unknown>) => Promise<unknown>} handler
 */

/** @type {ToolDefinition[]} */
export const tools = [
  {
    name: "send_sms",
    description:
      "Send an SMS message from the authenticated extension. Requires SMS-capable phone number on the from field.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Sender phone number in E.164 format (must be owned by extension)" },
        to: { type: "string", description: "Recipient phone number in E.164 format" },
        text: { type: "string", description: "SMS message body" },
      },
      required: ["from", "to", "text"],
    },
    handler: async (args) => {
      const body = {
        from: { phoneNumber: String(args.from) },
        to: [{ phoneNumber: String(args.to) }],
        text: String(args.text),
      };
      const result = /** @type {Record<string, unknown>} */ (
        await rcPost("/restapi/v1.0/account/~/extension/~/sms", body)
      );
      return mapSmsMessage(result);
    },
  },
  {
    name: "list_messages",
    description:
      "List SMS messages from the message store. Supports date range and read status filters.",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string", description: "ISO 8601 start date (e.g. 2024-01-01T00:00:00.000Z)" },
        dateTo: { type: "string", description: "ISO 8601 end date" },
        readStatus: { type: "string", enum: ["Read", "Unread"], description: "Filter by read status" },
        page: { type: "number", description: "Page number (default 1)" },
        perPage: { type: "number", description: "Results per page (default 100, max 1000)" },
      },
    },
    handler: async (args) => {
      /** @type {Record<string, unknown>} */
      const query = {
        messageType: "SMS",
        availability: "Alive",
        page: args.page ?? 1,
        perPage: args.perPage ?? 100,
      };
      if (args.dateFrom) query.dateFrom = args.dateFrom;
      if (args.dateTo) query.dateTo = args.dateTo;
      if (args.readStatus) query.readStatus = args.readStatus;

      const result = /** @type {{ records?: Array<Record<string, unknown>>; paging?: unknown }} */ (
        await rcGet("/restapi/v1.0/account/~/extension/~/message-store", query)
      );
      return {
        messages: (result.records ?? []).map(mapSmsMessage),
        paging: result.paging ?? null,
      };
    },
  },
  {
    name: "get_message",
    description: "Get a single SMS message by ID from the message store.",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "Message store record ID" },
      },
      required: ["messageId"],
    },
    handler: async (args) => {
      const result = /** @type {Record<string, unknown>} */ (
        await rcGet(`/restapi/v1.0/account/~/extension/~/message-store/${args.messageId}`)
      );
      return mapSmsMessage(result);
    },
  },
  {
    name: "update_message_status",
    description: "Mark an SMS message as read or unread.",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "Message store record ID" },
        readStatus: { type: "string", enum: ["Read", "Unread"], description: "New read status" },
      },
      required: ["messageId", "readStatus"],
    },
    handler: async (args) => {
      const result = /** @type {Record<string, unknown>} */ (
        await rcPut(`/restapi/v1.0/account/~/extension/~/message-store/${args.messageId}`, {
          readStatus: args.readStatus,
        })
      );
      return mapSmsMessage(result);
    },
  },
  {
    name: "delete_message",
    description: "Delete an SMS message from the message store.",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "Message store record ID" },
      },
      required: ["messageId"],
    },
    handler: async (args) => {
      await rcDelete(`/restapi/v1.0/account/~/extension/~/message-store/${args.messageId}`);
      return { deleted: true, messageId: String(args.messageId) };
    },
  },
  {
    name: "list_call_log",
    description: "List call log records for the authenticated extension.",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string", description: "ISO 8601 start date" },
        dateTo: { type: "string", description: "ISO 8601 end date" },
        direction: { type: "string", enum: ["Inbound", "Outbound"], description: "Call direction filter" },
        type: {
          type: "string",
          description: "Call type filter (e.g. Voice, Fax)",
        },
        page: { type: "number", description: "Page number (default 1)" },
        perPage: { type: "number", description: "Results per page (default 100)" },
      },
    },
    handler: async (args) => {
      /** @type {Record<string, unknown>} */
      const query = {
        page: args.page ?? 1,
        perPage: args.perPage ?? 100,
        view: "Detailed",
      };
      if (args.dateFrom) query.dateFrom = args.dateFrom;
      if (args.dateTo) query.dateTo = args.dateTo;
      if (args.direction) query.direction = args.direction;
      if (args.type) query.type = args.type;

      const result = /** @type {{ records?: Array<Record<string, unknown>>; paging?: unknown }} */ (
        await rcGet("/restapi/v1.0/account/~/extension/~/call-log", query)
      );
      return {
        calls: (result.records ?? []).map(mapCallRecord),
        paging: result.paging ?? null,
      };
    },
  },
  {
    name: "get_call_record",
    description: "Get a single call log record by ID.",
    inputSchema: {
      type: "object",
      properties: {
        callRecordId: { type: "string", description: "Call log record ID" },
      },
      required: ["callRecordId"],
    },
    handler: async (args) => {
      const result = /** @type {Record<string, unknown>} */ (
        await rcGet(`/restapi/v1.0/account/~/extension/~/call-log/${args.callRecordId}`)
      );
      return mapCallRecord(result);
    },
  },
  {
    name: "list_active_calls",
    description:
      "List currently active calls for the authenticated extension (real-time call monitoring).",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const result = /** @type {{ records?: Array<Record<string, unknown>> }} */ (
        await rcGet("/restapi/v1.0/account/~/extension/~/active-calls")
      );
      return {
        activeCalls: (result.records ?? []).map(mapActiveCall),
      };
    },
  },
  {
    name: "make_ringout",
    description:
      "Initiate an outbound call via RingOut. RingCentral calls the 'from' number first, then connects to 'to'.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Your phone number in E.164 (RingOut calls this number first)" },
        to: { type: "string", description: "Destination phone number in E.164" },
        callerId: { type: "string", description: "Optional caller ID shown to recipient" },
      },
      required: ["from", "to"],
    },
    handler: async (args) => {
      /** @type {Record<string, unknown>} */
      const body = {
        from: { phoneNumber: String(args.from) },
        to: { phoneNumber: String(args.to) },
        playPrompt: false,
      };
      if (args.callerId) {
        body.callerId = { phoneNumber: String(args.callerId) };
      }
      const result = /** @type {Record<string, unknown>} */ (
        await rcPost("/restapi/v1.0/account/~/extension/~/ring-out", body)
      );
      return mapRingOutStatus(result);
    },
  },
  {
    name: "get_ringout_status",
    description: "Get the status of a RingOut call by ID.",
    inputSchema: {
      type: "object",
      properties: {
        ringoutId: { type: "string", description: "RingOut session ID" },
      },
      required: ["ringoutId"],
    },
    handler: async (args) => {
      const result = /** @type {Record<string, unknown>} */ (
        await rcGet(`/restapi/v1.0/account/~/extension/~/ring-out/${args.ringoutId}`)
      );
      return mapRingOutStatus(result);
    },
  },
  {
    name: "cancel_ringout",
    description: "Cancel an in-progress RingOut call.",
    inputSchema: {
      type: "object",
      properties: {
        ringoutId: { type: "string", description: "RingOut session ID" },
      },
      required: ["ringoutId"],
    },
    handler: async (args) => {
      await rcDelete(`/restapi/v1.0/account/~/extension/~/ring-out/${args.ringoutId}`);
      return { cancelled: true, ringoutId: String(args.ringoutId) };
    },
  },
  {
    name: "list_voicemails",
    description: "List voicemail messages from the message store.",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string", description: "ISO 8601 start date" },
        dateTo: { type: "string", description: "ISO 8601 end date" },
        readStatus: { type: "string", enum: ["Read", "Unread"], description: "Filter by read status" },
        page: { type: "number", description: "Page number (default 1)" },
        perPage: { type: "number", description: "Results per page (default 100)" },
      },
    },
    handler: async (args) => {
      /** @type {Record<string, unknown>} */
      const query = {
        messageType: "VoiceMail",
        availability: "Alive",
        page: args.page ?? 1,
        perPage: args.perPage ?? 100,
      };
      if (args.dateFrom) query.dateFrom = args.dateFrom;
      if (args.dateTo) query.dateTo = args.dateTo;
      if (args.readStatus) query.readStatus = args.readStatus;

      const result = /** @type {{ records?: Array<Record<string, unknown>>; paging?: unknown }} */ (
        await rcGet("/restapi/v1.0/account/~/extension/~/message-store", query)
      );
      return {
        voicemails: (result.records ?? []).map(mapVoicemail),
        paging: result.paging ?? null,
      };
    },
  },
  {
    name: "get_voicemail",
    description:
      "Get voicemail metadata including content URI for audio download. Does not return binary audio data.",
    inputSchema: {
      type: "object",
      properties: {
        voicemailId: { type: "string", description: "Voicemail message store record ID" },
      },
      required: ["voicemailId"],
    },
    handler: async (args) => {
      const result = /** @type {Record<string, unknown>} */ (
        await rcGet(`/restapi/v1.0/account/~/extension/~/message-store/${args.voicemailId}`)
      );
      return mapVoicemailDetail(result);
    },
  },
  {
    name: "list_phone_numbers",
    description: "List phone numbers assigned to the authenticated extension.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number (default 1)" },
        perPage: { type: "number", description: "Results per page (default 100)" },
      },
    },
    handler: async (args) => {
      const result = /** @type {{ records?: Array<Record<string, unknown>>; paging?: unknown }} */ (
        await rcGet("/restapi/v1.0/account/~/extension/~/phone-number", {
          page: args.page ?? 1,
          perPage: args.perPage ?? 100,
        })
      );
      return {
        phoneNumbers: (result.records ?? []).map(mapPhoneNumber),
        paging: result.paging ?? null,
      };
    },
  },
  {
    name: "get_extension_info",
    description: "Get information about the authenticated extension (who am I).",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const result = /** @type {Record<string, unknown>} */ (
        await rcGet("/restapi/v1.0/account/~/extension/~")
      );
      return mapExtensionInfo(result);
    },
  },
  {
    name: "list_subscriptions",
    description: "List webhook/event subscriptions for monitoring SMS and call events.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const result = /** @type {{ records?: Array<Record<string, unknown>> }} */ (
        await rcGet("/restapi/v1.0/subscription")
      );
      return {
        subscriptions: (result.records ?? []).map(mapSubscription),
      };
    },
  },
  {
    name: "create_subscription",
    description:
      "Create a webhook subscription for monitoring message-store and telephony session events. " +
      "Required event filters for SMS monitoring: /restapi/v1.0/account/~/extension/~/message-store. " +
      "For call monitoring: /restapi/v1.0/account/~/telephony/sessions. " +
      "If eventFilters is omitted, both default filters are used.",
    inputSchema: {
      type: "object",
      properties: {
        webhookUrl: {
          type: "string",
          description: "HTTPS URL that will receive webhook POST notifications",
        },
        eventFilters: {
          type: "array",
          items: { type: "string" },
          description:
            "Event filter paths. Defaults to message-store and telephony/sessions filters if omitted.",
        },
        expiresIn: {
          type: "number",
          description: "Subscription lifetime in seconds (max 315360000, default 604800 = 7 days)",
        },
      },
      required: ["webhookUrl"],
    },
    handler: async (args) => {
      const defaultFilters = [
        "/restapi/v1.0/account/~/extension/~/message-store",
        "/restapi/v1.0/account/~/telephony/sessions",
      ];
      const eventFilters = /** @type {string[] | undefined} */ (args.eventFilters) ?? defaultFilters;
      const body = {
        eventFilters,
        deliveryMode: {
          transportType: "WebHook",
          address: String(args.webhookUrl),
        },
        expiresIn: args.expiresIn ?? 604800,
      };
      const result = /** @type {Record<string, unknown>} */ (
        await rcPost("/restapi/v1.0/subscription", body)
      );
      return mapSubscription(result);
    },
  },
  {
    name: "delete_subscription",
    description: "Delete a webhook/event subscription by ID.",
    inputSchema: {
      type: "object",
      properties: {
        subscriptionId: { type: "string", description: "Subscription ID" },
      },
      required: ["subscriptionId"],
    },
    handler: async (args) => {
      await rcDelete(`/restapi/v1.0/subscription/${args.subscriptionId}`);
      return { deleted: true, subscriptionId: String(args.subscriptionId) };
    },
  },
];

/** @type {Map<string, ToolDefinition>} */
const toolMap = new Map(tools.map((t) => [t.name, t]));

/**
 * @param {string} name
 * @returns {ToolDefinition | undefined}
 */
export function getTool(name) {
  return toolMap.get(name);
}

/**
 * @returns {Array<{ name: string; description: string; inputSchema: ToolDefinition["inputSchema"] }>}
 */
export function listToolDefinitions() {
  return tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} args
 * @returns {Promise<unknown>}
 */
export async function callTool(name, args) {
  const tool = getTool(name);
  if (!tool) {
    throw { error: `Unknown tool: ${name}` };
  }
  return tool.handler(args ?? {});
}
