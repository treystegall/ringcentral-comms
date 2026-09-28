import process from "node:process";
import { handleRequest, readMessages, writeMessage } from "./mcp.js";

readMessages(process.stdin, (message) => {
  handleRequest(message).then(writeMessage).catch((err) => {
    process.stderr.write(`MCP handler error: ${err instanceof Error ? err.message : String(err)}\n`);
  });
});

process.stdin.on("end", () => {
  process.exit(0);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
