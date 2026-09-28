/**
 * @param {{ phoneNumber?: string; name?: string } | undefined} party
 * @returns {string}
 */
function partyNumber(party) {
  if (!party) return "";
  return party.phoneNumber ?? party.name ?? "";
}

/**
 * @param {Array<{ phoneNumber?: string; name?: string }> | undefined} parties
 * @returns {string}
 */
function partiesNumbers(parties) {
  if (!parties?.length) return "";
  return parties.map((p) => p.phoneNumber ?? p.name ?? "").filter(Boolean).join(", ");
}

/**
 * @param {{ id?: number | string; subject?: string; attachments?: Array<{ type?: string; contentType?: string }> } } record
 * @returns {string}
 */
function smsText(record) {
  if (record.subject) return record.subject;
  const textAttachment = record.attachments?.find(
    (a) => a.type === "Text" || a.contentType === "text/plain",
  );
  return textAttachment ? "(attachment)" : "";
}

/**
 * @typedef {Object} SmsMessage
 * @property {string} id
 * @property {string} direction
 * @property {string} from
 * @property {string} to
 * @property {string} text
 * @property {string} status
 * @property {string} createdAt
 * @property {string} readStatus
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {SmsMessage}
 */
export function mapSmsMessage(record) {
  return {
    id: String(record.id ?? ""),
    direction: String(record.direction ?? ""),
    from: partyNumber(/** @type {{ phoneNumber?: string; name?: string }} */ (record.from)),
    to: partiesNumbers(/** @type {Array<{ phoneNumber?: string; name?: string }>} */ (record.to)),
    text: smsText(/** @type {{ id?: number; subject?: string; attachments?: Array<{ type?: string; contentType?: string }> }} */ (record)),
    status: String(record.messageStatus ?? ""),
    createdAt: String(record.creationTime ?? ""),
    readStatus: String(record.readStatus ?? ""),
  };
}

/**
 * @typedef {Object} CallRecord
 * @property {string} id
 * @property {string} direction
 * @property {string} from
 * @property {string} to
 * @property {string} result
 * @property {string} startTime
 * @property {number} durationSec
 * @property {string} type
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {CallRecord}
 */
export function mapCallRecord(record) {
  const from = /** @type {{ phoneNumber?: string }} */ (record.from);
  const to = /** @type {{ phoneNumber?: string }} */ (record.to);
  return {
    id: String(record.id ?? ""),
    direction: String(record.direction ?? ""),
    from: from?.phoneNumber ?? "",
    to: to?.phoneNumber ?? "",
    result: String(record.result ?? ""),
    startTime: String(record.startTime ?? ""),
    durationSec: Number(record.duration ?? 0),
    type: String(record.type ?? ""),
  };
}

/**
 * @typedef {Object} ActiveCall
 * @property {string} sessionId
 * @property {string} partyId
 * @property {string} status
 * @property {string} from
 * @property {string} to
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {ActiveCall}
 */
export function mapActiveCall(record) {
  const from = /** @type {{ phoneNumber?: string }} */ (record.from);
  const to = /** @type {{ phoneNumber?: string }} */ (record.to);
  return {
    sessionId: String(record.telephonySessionId ?? record.sessionId ?? record.id ?? ""),
    partyId: String(record.partyId ?? record.id ?? ""),
    status: String(record.status ?? record.telephonyStatus ?? ""),
    from: from?.phoneNumber ?? partyNumber(from),
    to: to?.phoneNumber ?? partyNumber(to),
  };
}

/**
 * @typedef {Object} Voicemail
 * @property {string} id
 * @property {string} from
 * @property {string} to
 * @property {number} durationSec
 * @property {string} createdAt
 * @property {string} readStatus
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {Voicemail}
 */
export function mapVoicemail(record) {
  const attachment = /** @type {{ vmDuration?: number } | undefined} */ (
    Array.isArray(record.attachments) ? record.attachments[0] : undefined
  );
  return {
    id: String(record.id ?? ""),
    from: partyNumber(/** @type {{ phoneNumber?: string; name?: string }} */ (record.from)),
    to: partiesNumbers(/** @type {Array<{ phoneNumber?: string; name?: string }>} */ (record.to)),
    durationSec: Number(attachment?.vmDuration ?? 0),
    createdAt: String(record.creationTime ?? ""),
    readStatus: String(record.readStatus ?? ""),
  };
}

/**
 * @typedef {Object} VoicemailDetail
 * @property {string} id
 * @property {string} from
 * @property {string} to
 * @property {number} durationSec
 * @property {string} createdAt
 * @property {string} readStatus
 * @property {string | null} contentUri
 * @property {string | null} transcriptionStatus
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {VoicemailDetail}
 */
export function mapVoicemailDetail(record) {
  const base = mapVoicemail(record);
  const audioAttachment = /** @type {{ uri?: string } | undefined} */ (
    Array.isArray(record.attachments)
      ? record.attachments.find((a) => /** @type {{ type?: string }} */ (a).type === "AudioRecording")
      : undefined
  );
  return {
    ...base,
    contentUri: audioAttachment?.uri ?? null,
    transcriptionStatus: String(record.vmTranscriptionStatus ?? ""),
  };
}

/**
 * @typedef {Object} PhoneNumber
 * @property {string} id
 * @property {string} e164
 * @property {string} usageType
 * @property {string[]} features
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {PhoneNumber}
 */
export function mapPhoneNumber(record) {
  const features = /** @type {Array<{ featureName?: string }> | undefined} */ (record.features);
  return {
    id: String(record.id ?? ""),
    e164: String(record.phoneNumber ?? ""),
    usageType: String(record.usageType ?? ""),
    features: features?.map((f) => f.featureName ?? "").filter(Boolean) ?? [],
  };
}

/**
 * @typedef {Object} ExtensionInfo
 * @property {string} id
 * @property {string} extensionNumber
 * @property {string} name
 * @property {string} status
 * @property {string} type
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {ExtensionInfo}
 */
export function mapExtensionInfo(record) {
  const contact = /** @type {{ firstName?: string; lastName?: string } | undefined} */ (record.contact);
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
  return {
    id: String(record.id ?? ""),
    extensionNumber: String(record.extensionNumber ?? ""),
    name: name || String(record.name ?? ""),
    status: String(record.status ?? ""),
    type: String(record.type ?? ""),
  };
}

/**
 * @typedef {Object} Subscription
 * @property {string} id
 * @property {string} status
 * @property {string} deliveryMode
 * @property {string} address
 * @property {string[]} eventFilters
 * @property {string} expirationTime
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {Subscription}
 */
export function mapSubscription(record) {
  const delivery = /** @type {{ transportType?: string; address?: string } | undefined} */ (record.deliveryMode);
  const filters = /** @type {string[] | undefined} */ (record.eventFilters);
  return {
    id: String(record.id ?? ""),
    status: String(record.status ?? ""),
    deliveryMode: String(delivery?.transportType ?? ""),
    address: String(delivery?.address ?? ""),
    eventFilters: filters ?? [],
    expirationTime: String(record.expirationTime ?? ""),
  };
}

/**
 * @typedef {Object} RingOutStatus
 * @property {string} id
 * @property {string} status
 * @property {string} from
 * @property {string} to
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {RingOutStatus}
 */
export function mapRingOutStatus(record) {
  const from = /** @type {{ phoneNumber?: string }} */ (record.from);
  const to = /** @type {{ phoneNumber?: string }} */ (record.to);
  return {
    id: String(record.id ?? ""),
    status: String(record.status ?? ""),
    from: from?.phoneNumber ?? "",
    to: to?.phoneNumber ?? "",
  };
}
