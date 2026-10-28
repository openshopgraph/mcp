#!/usr/bin/env node
// stdio <-> Streamable HTTP bridge. Forwards raw JSON-RPC messages unchanged
// in both directions; no protocol logic, no telemetry.
// Env: OSG_API_TOKEN (optional, sent as x-api-token),
//      OSG_MCP_URL (override endpoint, default below),
//      OSG_TIMEOUT_MS (per HTTP request, default 60000).
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.OSG_MCP_URL || "https://api.openshopgraph.com/mcp";
const timeoutMs = Number(process.env.OSG_TIMEOUT_MS) || 60000;
const token = process.env.OSG_API_TOKEN;

const requestInit = token ? { headers: { "x-api-token": token } } : undefined;
const timedFetch = (u, init) =>
  fetch(u, init?.method === "GET" ? init : { ...init, signal: AbortSignal.timeout(timeoutMs) });

const stdio = new StdioServerTransport();
const remote = new StreamableHTTPClientTransport(new URL(url), { requestInit, fetch: timedFetch });

const die = (msg) => {
  process.stderr.write(`openshopgraph-mcp: ${msg}\n`);
  process.exit(1);
};

stdio.onmessage = async (msg) => {
  try {
    await remote.send(msg);
  } catch (e) {
    const detail = `${e?.message ?? e}`;
    if (msg.method === "initialize") die(`cannot reach ${url}: ${detail}`);
    if (msg.id !== undefined && msg.method) {
      await stdio.send({ jsonrpc: "2.0", id: msg.id, error: { code: -32603, message: `openshopgraph-mcp: ${detail}` } });
    } else {
      process.stderr.write(`openshopgraph-mcp: ${detail}\n`);
    }
  }
};
remote.onmessage = (msg) => stdio.send(msg).catch((e) => die(String(e?.message ?? e)));
remote.onerror = (e) => process.stderr.write(`openshopgraph-mcp: ${e?.message ?? e}\n`);
stdio.onerror = (e) => process.stderr.write(`openshopgraph-mcp: ${e?.message ?? e}\n`);
stdio.onclose = async () => { await remote.close().catch(() => {}); process.exit(0); };

await remote.start();
await stdio.start();
