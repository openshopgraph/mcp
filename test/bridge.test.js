import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/openshopgraph-mcp.js", import.meta.url));

// Starts the real entry point, sends JSON-RPC lines over stdio, collects replies by id.
function run(env, steps, limitMs) {
  const p = spawn(process.execPath, [bin], { env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"] });
  let buf = "", err = "";
  const got = new Map(), waiters = new Map();
  p.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      if (m.id !== undefined) { got.set(m.id, m); waiters.get(m.id)?.(m); }
    }
  });
  p.stderr.on("data", (d) => (err += d));
  const exited = new Promise((r) => p.on("exit", (code, sig) => r({ code, sig })));
  const send = (m) => p.stdin.write(JSON.stringify(m) + "\n");
  const reply = (id) => got.has(id) ? Promise.resolve(got.get(id)) : new Promise((r) => waiters.set(id, r));
  const timer = setTimeout(() => p.kill("SIGKILL"), limitMs);
  return (async () => {
    await steps({ send, reply });
    // still alive after steps: end stdin, then force-kill as last resort
    p.stdin.end();
    const killer = setTimeout(() => p.kill("SIGKILL"), 3000);
    const { code, sig } = await exited;
    clearTimeout(killer); clearTimeout(timer);
    return { code, sig, err };
  })();
}

const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "0" } } };

test("real server: initialize, tools/list >=1, find_shop zalando.de", { timeout: 60000 }, async () => {
  const out = {};
  const r = await run({}, async ({ send, reply }) => {
    send(init); out.init = await reply(1);
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" }); out.list = await reply(2);
    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "find_shop", arguments: { query: "zalando.de" } } });
    out.call = await reply(3);
    process.stderr.write(`TOOLS=${out.list.result.tools.length} FIND=${JSON.stringify(out.call.result).slice(0, 300)}\n`);
  }, 50000);
  assert.ok(out.init.result.serverInfo);
  assert.ok(out.list.result.tools.length >= 1);
  assert.ok(out.list.result.tools.some((t) => t.name === "find_shop"));
  assert.ok(!out.call.result.isError, JSON.stringify(out.call.result));
  assert.match(JSON.stringify(out.call.result.content), /zalando/i);
  assert.equal(r.code, 0);
});

for (const [name, u] of [["wrong path", "https://api.openshopgraph.com/does-not-exist"], ["unresolvable host", "https://nonexistent.invalid/mcp"]]) {
  test(`red proof: ${name} -> clear error, exit != 0, no hang`, { timeout: 30000 }, async () => {
    const t0 = Date.now();
    const r = await run({ OSG_MCP_URL: u, OSG_TIMEOUT_MS: "8000" },
      async ({ send }) => { send(init); await new Promise((res) => setTimeout(res, 15000)); }, 25000);
    assert.equal(r.sig, null, "process had to be killed (hang)");
    assert.ok(r.code !== 0 && r.code !== null);
    assert.match(r.err, /openshopgraph-mcp: cannot reach/);
    assert.ok(Date.now() - t0 < 20000);
  });
}
