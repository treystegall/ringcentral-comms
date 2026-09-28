import { getPlatform } from "./auth.js";
import { toStructuredError } from "./errors.js";

/**
 * @param {string} path
 * @param {Record<string, unknown>} [query]
 * @returns {Promise<unknown>}
 */
export async function rcGet(path, query) {
  try {
    const platform = await getPlatform();
    const response = await platform.get(path, query);
    return response.json();
  } catch (err) {
    throw toStructuredError(err);
  }
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} [body]
 * @returns {Promise<unknown>}
 */
export async function rcPost(path, body) {
  try {
    const platform = await getPlatform();
    const response = await platform.post(path, body);
    return response.json();
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      throw err;
    }
    throw toStructuredError(err);
  }
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} [body]
 * @returns {Promise<unknown>}
 */
export async function rcPut(path, body) {
  try {
    const platform = await getPlatform();
    const response = await platform.put(path, body);
    return response.json();
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      throw err;
    }
    throw toStructuredError(err);
  }
}

/**
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function rcDelete(path) {
  try {
    const platform = await getPlatform();
    await platform.delete(path);
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      throw err;
    }
    throw toStructuredError(err);
  }
}
