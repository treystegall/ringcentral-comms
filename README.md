# ringcentral-comms

Agent Plugin that wraps the RingCentral REST API for sending, receiving, and monitoring SMS and phone calls.

## Setup

### 1. Create a RingCentral app

1. Sign in at the [RingCentral Developer Portal](https://developers.ringcentral.com/).
2. Create a **REST API App** with **JWT auth flow**.
3. Add required permissions for your use case:
   - **SMS**: `SMS`, `ReadMessages`, `EditMessages`
   - **Calls**: `ReadCallLog`, `CallControl` (for active calls)
   - **RingOut**: `RingOut`
   - **Subscriptions**: `SubscriptionWebhook`
4. Generate a JWT credential for your extension user.
5. Note the **Client ID**, **Client Secret**, and **JWT**.

### 2. Configure plugin variables

In Cursor, JWT and API credentials are defined in `.cursor-plugin/plugin.json` under the `variables` JSON Schema. Set values in your Cursor plugin configuration (never commit real secrets):

Also available as MCP env placeholders in `mcp.json`:

| Variable | Description |
|----------|-------------|
| `RINGCENTRAL_CLIENT_ID` | App Client ID |
| `RINGCENTRAL_CLIENT_SECRET` | App Client Secret |
| `RINGCENTRAL_JWT` | JWT credential for server-side auth |
| `RINGCENTRAL_SERVER_URL` | Optional; defaults to `https://platform.ringcentral.com` |

### 3. Install dependencies

```bash
npm install
```

### 4. Run the MCP server

```bash
npm start
```

## SDK choice

This plugin uses [`@ringcentral/sdk`](https://www.npmjs.com/package/@ringcentral/sdk) for JWT authentication and HTTP requests. The official SDK handles token exchange, refresh, and API response parsing reliably. The MCP JSON-RPC layer is hand-rolled (zero additional MCP dependencies).

Requires **Node.js 18+**.

## Tools

All tools return normalized domain types, not raw RingCentral JSON.

### SMS / Message Store

| Tool | Description |
|------|-------------|
| `send_sms` | Send an SMS message |
| `list_messages` | List SMS messages (date/read filters) |
| `get_message` | Get one SMS by ID |
| `update_message_status` | Mark read/unread |
| `delete_message` | Delete a message |

### Calls

| Tool | Description |
|------|-------------|
| `list_call_log` | List call history |
| `get_call_record` | Get one call record |
| `list_active_calls` | List in-progress calls |
| `make_ringout` | Place outbound call via RingOut |
| `get_ringout_status` | Check RingOut status |
| `cancel_ringout` | Cancel RingOut |

### Voicemail

| Tool | Description |
|------|-------------|
| `list_voicemails` | List voicemail messages |
| `get_voicemail` | Voicemail metadata + content URI |

### Numbers / Account

| Tool | Description |
|------|-------------|
| `list_phone_numbers` | Extension phone numbers |
| `get_extension_info` | Authenticated extension details |

### Monitoring

| Tool | Description |
|------|-------------|
| `list_subscriptions` | List webhook subscriptions |
| `create_subscription` | Create SMS/call webhook |
| `delete_subscription` | Remove subscription |

## Domain types

```typescript
SmsMessage   = { id, direction, from, to, text, status, createdAt, readStatus }
CallRecord   = { id, direction, from, to, result, startTime, durationSec, type }
ActiveCall   = { sessionId, partyId, status, from, to }
Voicemail    = { id, from, to, durationSec, createdAt, readStatus }
PhoneNumber  = { id, e164, usageType, features }
```

## Official API references

- [RingCentral Developer Guide](https://developers.ringcentral.com/)
- [Message Store](https://developers.ringcentral.com/guide/messaging/message-store/working-with-message-store)
- [Call Log](https://developers.ringcentral.com/guide/voice/call-log)
- [RingOut](https://developers.ringcentral.com/guide/voice/ring-out)
- [Webhooks / Subscriptions](https://developers.ringcentral.com/guide/notifications/webhooks/creating-webhooks)

## Plugin layout

```
plugin.json          # Agent Plugin manifest (Agent Plugins 1.0.0)
.cursor-plugin/plugin.json  # Cursor plugin variables (JWT credentials)
mcp.json             # MCP server configuration
skills/              # Agent skill for tool selection guidance
server/              # Node.js stdio MCP server
  index.js           # Entry point
  auth.js            # JWT authentication
  client.js          # API client wrapper
  mappers.js         # Domain type mappers
  tools.js           # Tool definitions and handlers
  mcp.js             # JSON-RPC / MCP protocol
```

## License

MIT
