/** @typedef {{ error: string; status?: number; details?: unknown }} StructuredError */

/**
 * @param {unknown} err
 * @returns {StructuredError}
 */
export function toStructuredError(err) {
  if (err && typeof err === "object" && "apiResponse" in err) {
    const apiErr = /** @type {{ message?: string; apiResponse?: { response?: () => { status?: number; error?: () => unknown } } }} */ (err);
    const response = apiErr.apiResponse?.response?.();
    const status = response?.status?.();
    const body = response?.error?.();
    return {
      error: apiErr.message ?? "RingCentral API error",
      status,
      details: body ?? undefined,
    };
  }

  if (err instanceof Error) {
    return { error: err.message };
  }

  return { error: String(err) };
}

/**
 * @param {StructuredError} structured
 * @returns {{ content: Array<{ type: "text"; text: string }>; isError: true }}
 */
export function errorResult(structured) {
  return {
    content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
    isError: true,
  };
}

/**
 * @param {unknown} data
 * @returns {{ content: Array<{ type: "text"; text: string }> }}
 */
export function successResult(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
