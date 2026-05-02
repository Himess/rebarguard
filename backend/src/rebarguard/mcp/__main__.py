"""Entry point for `python -m rebarguard.mcp`."""

import asyncio

from rebarguard.mcp.server import main

if __name__ == "__main__":
    asyncio.run(main())
