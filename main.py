import httpx
import os
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP, Context

load_dotenv()

API_KEY = os.environ["FLEETSMART_API_KEY"]
API_URL = os.environ["FLEETSMART_API_URL"]
HEADERS = {"X-API-KEY": API_KEY, "Content-Type": "application/json"}

mcp = FastMCP("Fleetsmart")


async def _fetch(ctx: Context, endpoint: str, params: dict = None) -> str:
    """Shared fetch helper with progress reporting."""
    await ctx.report_progress(0, 3)
    await ctx.info(f"Connecting to {endpoint}...")

    async with httpx.AsyncClient() as client:
        await ctx.report_progress(1, 3)
        await ctx.info(f"Requesting {endpoint}...")
        response = await client.get(
            f"{API_URL}/api/{endpoint}", headers=HEADERS, params=params or {}
        )
        response.raise_for_status()

        await ctx.report_progress(2, 3)
        await ctx.info(f"Processing {endpoint} response...")
        data = response.json()

        await ctx.report_progress(3, 3)
        await ctx.info(f"Done — {endpoint} returned {len(data) if isinstance(data, list) else 1} records")
        return str(data)


@mcp.tool()
async def list_vehicles(ctx: Context) -> str:
    """List all vehicles in the fleet with their current status."""
    return await _fetch(ctx, "vehicles")


@mcp.tool()
async def list_drivers(ctx: Context) -> str:
    """List all drivers."""
    return await _fetch(ctx, "drivers")


@mcp.tool()
async def list_live_views(ctx: Context) -> str:
    """List current live status for all vehicles (moving, stopped, idle, etc)."""
    return await _fetch(ctx, "live_views")


@mcp.tool()
async def list_harsh_events(ctx: Context, from_date: str = None, to_date: str = None) -> str:
    """List harsh driving events. Optionally filter by date range (ISO format, e.g. 2026-03-01)."""
    params = {}
    if from_date:
        params["filter[date_time][gte]"] = from_date
    if to_date:
        params["filter[date_time][lte]"] = to_date
    return await _fetch(ctx, "harsh_events", params)


@mcp.tool()
async def list_vehicle_locations(ctx: Context, vehicle_id: int = None) -> str:
    """List vehicle location history. Optionally filter by vehicle_id."""
    params = {}
    if vehicle_id:
        params["filter[vehicle_id]"] = vehicle_id
    return await _fetch(ctx, "vehicle_locations", params)


@mcp.tool()
async def list_pois(ctx: Context) -> str:
    """List all Points of Interest (POIs)."""
    return await _fetch(ctx, "pois")


@mcp.tool()
async def list_devices(ctx: Context) -> str:
    """List all tracking devices and their battery status."""
    return await _fetch(ctx, "devices")


@mcp.tool()
async def list_io_events(ctx: Context, vehicle_id: int = None, description: str = None) -> str:
    """List IO events (ignition on/off and other inputs). Optionally filter by description (e.g. 'Ignition')."""
    params = {}
    if vehicle_id:
        params["filter[vehicle_id]"] = vehicle_id
    if description:
        params["filter[description]"] = description
    return await _fetch(ctx, "io_events", params)


@mcp.tool()
async def list_poi_events(ctx: Context, vehicle_id: int = None) -> str:
    """List POI events (when vehicles entered or exited geofenced locations)."""
    params = {}
    if vehicle_id:
        params["filter[vehicle_id]"] = vehicle_id
    return await _fetch(ctx, "poi_events", params)


@mcp.tool()
async def list_driver_vehicle_assignments(driver_id: int = None, vehicle_id: int = None) -> str:
    """List driver-vehicle assignment history. Optionally filter by driver_id or vehicle_id."""
    params = {}
    if driver_id:
        params["filter[driver_id]"] = driver_id
    if vehicle_id:
        params["filter[vehicle_id]"] = vehicle_id
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/driver_vehicle_assignments", headers=HEADERS, params=params)
        response.raise_for_status()
        return str(response.json())


def main():
    mcp.run()


if __name__ == "__main__":
    main()
