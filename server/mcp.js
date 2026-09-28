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
 * Read MCP messages from stdin.
 * Framing: NDJSON by default (Grok Bot / fillout-style); Content-Length if the host speaks it first.
 * @param {import("node:stream").Readable} input
 * @param {(message: Record<string, unknown>) => void} onMessage
 */
export function readMessages(input, onMessage) {
  /** @type {Buffer} */
  let stdinBuf = Buffer.alloc(0);
  /** @type {"unknown" | "ndjson" | "content-length"} */
  let framing = "unknown";

  function processContentLength() {
    while (true) {
      const headerEnd = stdinBuf.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;
      const header = stdinBuf.subarray(0, headerEnd).toString("utf8");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        stdinBuf = stdinBuf.subarray(headerEnd + 4);
        continue;
      }
      const len = parseInt(match[1], 10);
      const start = headerEnd + 4;
      if (stdinBuf.length < start + len) return;
      const body = stdinBuf.subarray(start, start + len).toString("utf8");
      stdinBuf = stdinBuf.subarray(start + len);
      try {
        onMessage(JSON.parse(body));
      } catch {
        process.stderr.write("Failed to parse MCP message\n");
      }
    }
  }

  function processNdjson() {
    while (true) {
      const nl = stdinBuf.indexOf("\n");
      if (nl === -1) return;
      const line = stdinBuf.subarray(0, nl).toString("utf8").replace(/\r$/, "").trim();
      stdinBuf = stdinBuf.subarray(nl + 1);
      if (!line) continue;
      try {
        onMessage(JSON.parse(line));
      } catch {
        process.stderr.write("Failed to parse MCP message\n");
      }
    }
  }

  function detectAndProcess() {
    if (framing === "unknown") {
      const peek = stdinBuf.toString("utf8", 0, Math.min(stdinBuf.length, 64));
      if (/Content-Length:/i.test(peek)) {
        framing = "content-length";
      } else if (stdinBuf.indexOf("\n") !== -1) {
        framing = "ndjson";
      } else {
        return;
      }
    }
    if (framing === "content-length") processContentLength();
    else if (framing === "ndjson") processNdjson();
  }

  // Expose framing for writeMessage
  readMessages._getFraming = () => framing;

  input.on("data", (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    stdinBuf = Buffer.concat([stdinBuf, buf]);
    detectAndProcess();
  });
}

/**
 * @param {Record<string, unknown> | null} response
 */
export function writeMessage(response) {
  if (!response) return;
  const json = JSON.stringify(response);
  const framing =
    typeof readMessages._getFraming === "function" ? readMessages._getFraming() : "ndjson";
  if (framing === "content-length") {
    const body = Buffer.from(json, "utf8");
    process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
    process.stdout.write(body);
  } else {
    process.stdout.write(json + "\n");
  }
}
