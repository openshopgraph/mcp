# OpenShopGraph MCP

A neutral fact layer over online shops for AI agents and buyers. Read-only lookups of what a shop states about returns, shipping and payment methods, plus trust signals, each with its source and check date where one exists. Missing data is reported as missing, not guessed. Discount codes are an extra, not the point. No products, no price comparison.

- Endpoint: `https://api.openshopgraph.com/mcp` (MCP streamable HTTP)
- Registry ID: `com.openshopgraph/mcp` (official MCP Registry)
- Homepage: https://openshopgraph.com
- Coverage: the live shop count is on https://openshopgraph.com
- Privacy: https://openshopgraph.com/en/privacy/ · Imprint: https://openshopgraph.com/en/imprint/ · Terms: https://openshopgraph.com/en/terms/

## Tools

Open, no key needed:

| Tool | What it does |
|---|---|
| `find_shop` | Search shops by name or domain fragment, optional country and exact category slug |
| `list_categories` | The category taxonomy currently in use |
| `get_shop` | One shop by id or domain (public view) |
| `get_shop_policies` | What a shop states about returns, shipping and payment, each fact with source and check date |
| `get_shipping_policy` | Alias of `get_shop_policies` |
| `list_coupons` | Currently usable discount codes, with what was withheld and why |

Maintenance tools, not listed to anonymous clients (operator key, header `x-api-token`):

| Tool | What it does |
|---|---|
| `get_trust` | Individual trust signals OpenShopGraph measured (TLS, hosting, domain age, registrar), no aggregate score |
| `report_code` | Report a coupon as wrong, from a fixed reason list; queues a re-check |
| `report_issue` | Report a shop or data-fact issue, from a fixed reason list; queues a re-check |

## Connect

Claude Code:

```bash
claude mcp add --transport http openshopgraph https://api.openshopgraph.com/mcp
```

Or as a plugin: `claude plugin marketplace add openshopgraph/mcp`, then `claude plugin install openshopgraph@openshopgraph`.

Claude Desktop (`claude_desktop_config.json`, via mcp-remote):

```json
{
  "mcpServers": {
    "openshopgraph": {
      "command": "npx",
      "args": ["mcp-remote", "https://api.openshopgraph.com/mcp"]
    }
  }
}
```

Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "openshopgraph": { "url": "https://api.openshopgraph.com/mcp" }
  }
}
```

Cline (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "openshopgraph": {
      "url": "https://api.openshopgraph.com/mcp",
      "type": "streamableHttp",
      "disabled": false
    }
  }
}
```

ChatGPT: enable developer mode, add a custom MCP connector, URL `https://api.openshopgraph.com/mcp`, authentication none. The six open tools work without a key.

With a key, add the header `x-api-token: <your key>` where your client supports custom headers.

## Use via npx

For MCP clients without HTTP transport. The package `@openshopgraph/mcp` is a small stdio bridge: it forwards every JSON-RPC message unchanged to `https://api.openshopgraph.com/mcp` and back. No telemetry, no local state.

```bash
npx -y @openshopgraph/mcp
```

Client config:

```json
{
  "mcpServers": {
    "openshopgraph": { "command": "npx", "args": ["-y", "@openshopgraph/mcp"] }
  }
}
```

Optional environment variables: `OSG_API_TOKEN` (operator key, sent as `x-api-token`), `OSG_TIMEOUT_MS` (per HTTP request, default 60000), `OSG_MCP_URL` (endpoint override, for testing). If the server is unreachable during `initialize`, the bridge prints a clear error to stderr and exits with code 1. Tests: `npm install && npm test` (needs network; runs against the live server).

## Ready-to-use client examples

Remote URL only, no keys. Each file was checked against the framework's own documentation on 2026-10-28.

| Client | File | Notes |
|---|---|---|
| Claude Desktop | [`examples/claude-desktop/claude_desktop_config.json`](examples/claude-desktop/claude_desktop_config.json) | via `mcp-remote`; alternatively Settings, Connectors, Add custom connector, URL `https://api.openshopgraph.com/mcp` |
| Cursor | [`examples/cursor/mcp.json`](examples/cursor/mcp.json) | `.cursor/mcp.json`, top-level `mcpServers`, `url` |
| VS Code | [`examples/vscode/mcp.json`](examples/vscode/mcp.json) | `.vscode/mcp.json`, top-level `servers`, `"type": "http"` |
| OpenAI Agents SDK (Python) | [`examples/openai-agents-sdk/agent.py`](examples/openai-agents-sdk/agent.py) | `MCPServerStreamableHttp` |
| LangChain (Python) | [`examples/langchain/agent.py`](examples/langchain/agent.py) | `langchain-mcp-adapters`, `MultiServerMCPClient`, `"transport": "http"` |

## Example

Request (JSON-RPC over streamable HTTP, no key):

```bash
curl -s https://api.openshopgraph.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"get_shop_policies","arguments":{"shop_domain":"zalando.de"}}}'
```

Response (excerpt, `result.content[0].text`):

```json
{
  "shop": { "name": "Zalando", "canonical_domain": "zalando.de", "country": "DE" },
  "policies": {
    "returns_days": { "collected": true, "value": 30, "checked_at": "2026-10-14T16:57:31.420Z", "source": "policy_page" },
    "payment_methods": { "collected": true, "value": ["credit_card", "invoice", "paypal"], "checked_at": "2026-10-14T16:57:31.420Z", "source": "policy_page" },
    "buyer_protection": { "collected": false, "reason": "not_collected" }
  }
}
```

Every fact carries `checked_at` and `source`. A fact that was not collected says so (`collected: false`) instead of being guessed.

## License

Code: MIT. Data: CC BY 4.0, attribute "OpenShopGraph, https://openshopgraph.com". See [LICENSE](LICENSE) (code) and [DATA-LICENSE.md](DATA-LICENSE.md) (data).
