import { errorResult, successResult } from "./errors.js";
import { callTool, listToolDefinitions } from "./tools.js";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "ringcentral-comms";
const SERVER_VERSION = "0.1.0";

/** @type {boolean} */
let initialized = false;

/**
 * @param {Record<string, unknown>} request
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function handleRequest(request) {
  const { id, method, params } = request;

  try {
    switch (method) {
      case "initialize": {
        initialized = true;
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION,
            },
          },
        };
      }

      case "notifications/initialized":
        return null;

      case "ping":
        return { jsonrpc: "2.0", id, result: {} };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: listToolDefinitions(),
          },
        };

      case "tools/call": {
        if (!initialized) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32002, message: "Server not initialized" },
          };
        }
        const toolParams = /** @type {{ name?: string; arguments?: Record<string, unknown> } | undefined} */ (params);
        const toolName = toolParams?.name;
        if (!toolName) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name" },
          };
        }
        try {
          const data = await callTool(toolName, toolParams.arguments ?? {});
          return {
            jsonrpc: "2.0",
            id,
            result: successResult(data),
          };
        } catch (err) {
          const structured =
            err && typeof err === "object" && "error" in err
              ? err
              : { error: String(err) };
          return {
            jsonrpc: "2.0",
            id,
            result: errorResult(/** @type {import("./errors.js").StructuredError} */ (structured)),
          };
        }
      }

      default:
        if (id === undefined || id === null) {
          return null;
        }
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/**
 * Read MCP messages from stdin (Content-Length framed JSON-RPC).
 * @param {import("node:stream").Readable} input
 * @param {(message: Record<string, unknown>) => void} onMessage
 */
export function readMessages(input, onMessage) {
  /** @type {Buffer[]} */
  let bufferChunks = [];
  let bufferLength = 0;
  /** @type {number | null} */
  let contentLength = null;

  input.on("data", (chunk) => {
    bufferChunks.push(chunk);
    bufferLength += chunk.length;

    while (true) {
      if (contentLength === null) {
        const headerEnd = indexOfHeaders(bufferChunks, bufferLength);
        if (headerEnd === -1) return;

        const headerStr = bufferToString(bufferChunks, 0, headerEnd);
        const match = headerStr.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          throw new Error("Missing Content-Length header in MCP message");
        }
        contentLength = parseInt(match[1], 10);
        consumeBytes(bufferChunks, headerEnd);
        bufferLength -= headerEnd;
      }

      if (bufferLength < contentLength) return;

      const bodyStr = bufferToString(bufferChunks, 0, contentLength);
      consumeBytes(bufferChunks, contentLength);
      bufferLength -= contentLength;
      contentLength = null;

      try {
        const message = JSON.parse(bodyStr);
        onMessage(message);
      } catch {
        process.stderr.write("Failed to parse MCP message\n");
      }
    }
  });
}

/**
 * @param {Record<string, unknown> | null} response
 */
export function writeMessage(response) {
  if (!response) return;
  const body = JSON.stringify(response);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

/**
 * @param {Buffer[]} chunks
 * @param {number} length
 * @returns {number}
 */
function indexOfHeaders(chunks, length) {
  const marker = Buffer.from("\r\n\r\n");
  let scanned = 0;
  for (let i = 0; i < chunks.length && scanned < length; i++) {
    const chunk = chunks[i];
    const idx = chunk.indexOf(marker);
    if (idx !== -1) {
      return scanned + idx + marker.length;
    }
    scanned += chunk.length;
  }
  return -1;
}

/**
 * @param {Buffer[]} chunks
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
function bufferToString(chunks, start, end) {
  const parts = [];
  let offset = 0;
  for (const chunk of chunks) {
    const chunkEnd = offset + chunk.length;
    if (chunkEnd <= start) {
      offset = chunkEnd;
      continue;
    }
    const sliceStart = Math.max(0, start - offset);
    const sliceEnd = Math.min(chunk.length, end - offset);
    parts.push(chunk.subarray(sliceStart, sliceEnd));
    offset = chunkEnd;
    if (offset >= end) break;
  }
  return Buffer.concat(parts).toString("utf8");
}

/**
 * @param {Buffer[]} chunks
 * @param {number} count
 */
function consumeBytes(chunks, count) {
  while (count > 0 && chunks.length > 0) {
    const first = chunks[0];
    if (first.length <= count) {
      count -= first.length;
      chunks.shift();
    } else {
      chunks[0] = first.subarray(count);
      count = 0;
    }
  }
}
