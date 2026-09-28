import { SDK, setDefaultExternals } from "@ringcentral/sdk";
import DomStorage from "dom-storage";

/**
 * Prefer Node's built-in fetch. The SDK's bundled node-fetch@2 hits
 * ERR_STREAM_PREMATURE_CLOSE against platform.ringcentral.com on Node 20.
 */
setDefaultExternals({
  fetch: globalThis.fetch.bind(globalThis),
  Request: globalThis.Request,
  Response: globalThis.Response,
  Headers: globalThis.Headers,
  localStorage: new DomStorage(null, { strict: true }),
});

/** @type {import("@ringcentral/sdk").Platform | null} */
let platform = null;

/** @type {Promise<import("@ringcentral/sdk").Platform> | null} */
let loginPromise = null;

/**
 * @returns {{ clientId: string; clientSecret: string; jwt: string; server: string }}
 */
function getConfig() {
  const clientId = process.env.RINGCENTRAL_CLIENT_ID;
  const clientSecret = process.env.RINGCENTRAL_CLIENT_SECRET;
  const jwt = process.env.RINGCENTRAL_JWT;
  const server = process.env.RINGCENTRAL_SERVER_URL || "https://platform.ringcentral.com";

  if (!clientId || !clientSecret || !jwt) {
    throw new Error(
      "Missing RingCentral credentials. Set RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, and RINGCENTRAL_JWT.",
    );
  }

  return { clientId, clientSecret, jwt, server };
}

/**
 * Authenticate via JWT and return the SDK platform instance.
 * @returns {Promise<import("@ringcentral/sdk").Platform>}
 */
export async function getPlatform() {
  if (platform) {
    const loggedIn = await Promise.resolve(platform.loggedIn());
    if (loggedIn) return platform;
  }

  if (!loginPromise) {
    loginPromise = (async () => {
      const { clientId, clientSecret, jwt, server } = getConfig();
      const rcsdk = new SDK({ server, clientId, clientSecret });
      const p = rcsdk.platform();
      await p.login({ jwt });
      platform = p;
      return p;
    })().catch((err) => {
      loginPromise = null;
      throw err;
    });
  }

  return loginPromise;
}
