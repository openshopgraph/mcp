"""OpenAI Agents SDK (Python): OpenShopGraph as a remote MCP server.

pip install openai-agents   (and set OPENAI_API_KEY for the model)
"""
import asyncio

from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp


async def main() -> None:
    async with MCPServerStreamableHttp(
        name="OpenShopGraph",
        params={"url": "https://api.openshopgraph.com/mcp"},
        cache_tools_list=True,
    ) as server:
        agent = Agent(
            name="Shop facts",
            instructions="Use the OpenShopGraph tools to answer questions about what an online shop states on returns, shipping and payment. Name the source and check date.",
            mcp_servers=[server],
        )
        result = await Runner.run(agent, "What is the return window of zalando.de?")
        print(result.final_output)


asyncio.run(main())
