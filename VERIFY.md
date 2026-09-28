# Verification

Smoke-test the MCP server locally without live RingCentral credentials.

## Syntax check

```bash
node --check server/index.js
node --check server/mcp.js
node --check server/tools.js
node --check server/auth.js
node --check server/client.js
node --check server/mappers.js
node --check server/errors.js
```

Or check all server files at once:

```bash
for f in server/*.js; do node --check "$f" || exit 1; done
```

## Initialize + tools/list (no credentials required)

The MCP handshake and tool listing do not call the RingCentral API. Use this script to verify stdio framing and tool registration:

```bash
node --input-type=module <<'EOF'
import { spawn } from "node:child_process";

function frame(msg) {
  const body = JSON.stringify(msg);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

const child = spawn("node", ["server/index.js"], { stdio: ["pipe", "pipe", "inherit"] });

let buf = "";
child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  while (true) {
    const headerEnd = buf.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;
    const header = buf.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) break;
    const len = parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;
    if (buf.length < bodyStart + len) break;
    const body = buf.slice(bodyStart, bodyStart + len);
    buf = buf.slice(bodyStart + len);
    const response = JSON.parse(body);
    console.log(JSON.stringify(response, null, 2));
    if (response.result?.protocolVersion) {
      child.stdin.write(frame({ jsonrpc: "2.0", method: "notifications/initialized" }));
      child.stdin.write(frame({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
    }
    if (response.result?.tools) {
      console.log(`\nRegistered ${response.result.tools.length} tools:`);
      for (const t of response.result.tools) console.log(`  - ${t.name}`);
      child.kill();
    }
  }
});

child.stdin.write(frame({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "verify", version: "0.1.0" },
  },
}));
EOF
```

Expected output:

1. An `initialize` response with `protocolVersion` and `serverInfo.name` = `ringcentral-comms`.
2. A `tools/list` response with **18 tools** registered.

## Live API test (requires credentials)

Set environment variables and call a read-only tool:

```bash
export RINGCENTRAL_CLIENT_ID="your-client-id"
export RINGCENTRAL_CLIENT_SECRET="your-client-secret"
export RINGCENTRAL_JWT="your-jwt"

node --input-type=module <<'EOF'
import { spawn } from "node:child_process";

function frame(msg) {
  const body = JSON.stringify(msg);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

const child = spawn("node", ["server/index.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: process.env,
});

let step = 0;
let buf = "";
child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  while (true) {
    const headerEnd = buf.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;
    const header = buf.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) break;
    const len = parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;
    if (buf.length < bodyStart + len) break;
    const body = buf.slice(bodyStart, bodyStart + len);
    buf = buf.slice(bodyStart + len);
    const response = JSON.parse(body);
    console.log(JSON.stringify(response, null, 2));
    step++;
    if (step === 1) {
      child.stdin.write(frame({ jsonrpc: "2.0", method: "notifications/initialized" }));
      child.stdin.write(frame({
        jsonrpc: "2.0", id: 2, method: "tools/call",
        params: { name: "get_extension_info", arguments: {} },
      }));
    } else {
      child.kill();
    }
  }
});

child.stdin.write(frame({
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "verify", version: "0.1.0" } },
}));
EOF
```

This calls `get_extension_info` and prints the normalized extension record or a structured error if credentials are invalid.
