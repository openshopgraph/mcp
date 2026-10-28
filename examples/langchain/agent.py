"""LangChain: OpenShopGraph as a remote MCP server via langchain-mcp-adapters.

pip install langchain langchain-mcp-adapters langchain-openai   (and set OPENAI_API_KEY)
"""
import asyncio

from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient


async def main() -> None:
    client = MultiServerMCPClient(
        {
            "openshopgraph": {
                "url": "https://api.openshopgraph.com/mcp",
                "transport": "http",
            }
        }
    )
    tools = await client.get_tools()
    agent = create_agent("openai:gpt-4.1", tools)
    result = await agent.ainvoke({"messages": "What is the return window of zalando.de?"})
    print(result["messages"][-1].content)


asyncio.run(main())
