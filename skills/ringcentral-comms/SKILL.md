---
name: ringcentral-comms
description: Use RingCentral MCP tools to send SMS, read messages, manage call logs, monitor active calls, place RingOut calls, check voicemail, list phone numbers, and configure webhook subscriptions for real-time monitoring. Use when the user asks about RingCentral texting, calling, voicemails, or telephony monitoring.
---

# RingCentral Communications

Use the `ringcentral-comms` MCP server tools for RingCentral SMS and voice operations. All tool results use normalized domain shapes (`SmsMessage`, `CallRecord`, `ActiveCall`, `Voicemail`, `PhoneNumber`) — not raw RingCentral JSON.

Official API documentation: https://developers.ringcentral.com/

## When to use which tool

### SMS — send, receive, read status

| Task | Tool |
|------|------|
| Send a text message | `send_sms` |
| List incoming/outgoing SMS | `list_messages` |
| Read one message | `get_message` |
| Mark read/unread | `update_message_status` |
| Delete a message | `delete_message` |

Requires SMS-capable phone numbers on the extension. Use `list_phone_numbers` to find valid `from` numbers.

## RingOut defaults

RingOut dials `from` first, then bridges to `to`. Prefer a reachable PSTN phone (cell) for `from` — RingCentral Direct Numbers often fail with `callerStatus: GenericError` when used as the first leg.

When `from` or `callerId` are omitted, the server uses:

- `RINGCENTRAL_RINGOUT_FROM` — default first-leg number
- `RINGCENTRAL_RINGOUT_CALLER_ID` — default caller ID shown to the destination

Always confirm before placing a live RingOut unless the user already asked for that specific call.

### Calls — history, active monitoring, outbound RingOut

| Task | Tool |
|------|------|
| Browse call history | `list_call_log` |
| Get one call record | `get_call_record` |
| See calls in progress | `list_active_calls` |
| Place outbound call (RingOut) | `make_ringout` |
| Check RingOut progress | `get_ringout_status` |
| Cancel RingOut | `cancel_ringout` |

### Voicemail

| Task | Tool |
|------|------|
| List voicemails | `list_voicemails` |
| Get voicemail metadata + audio URI | `get_voicemail` |

`get_voicemail` returns a `contentUri` for audio download — it does not embed binary audio in the tool response.

### Account helpers

| Task | Tool |
|------|------|
| List extension phone numbers | `list_phone_numbers` |
| Who am I (extension info) | `get_extension_info` |

### Monitoring — webhook subscriptions

| Task | Tool |
|------|------|
| List existing subscriptions | `list_subscriptions` |
| Create webhook for SMS + call events | `create_subscription` |
| Remove a subscription | `delete_subscription` |

`create_subscription` defaults to these event filters when none are provided:

- `/restapi/v1.0/account/~/extension/~/message-store` — SMS and voicemail events
- `/restapi/v1.0/account/~/telephony/sessions` — call session events

The webhook URL must be a publicly reachable HTTPS endpoint.

## API guides

- Message Store: https://developers.ringcentral.com/guide/messaging/message-store/working-with-message-store
- Call Log: https://developers.ringcentral.com/guide/voice/call-log
- RingOut: https://developers.ringcentral.com/guide/voice/ring-out
- Subscriptions / webhooks: https://developers.ringcentral.com/guide/notifications/webhooks/creating-webhooks

## Credentials

The plugin requires RingCentral JWT credentials configured as plugin variables (`RINGCENTRAL_CLIENT_ID`, `RINGCENTRAL_CLIENT_SECRET`, `RINGCENTRAL_JWT`). Create a JWT auth app in the [RingCentral Developer Portal](https://developers.ringcentral.com/).
