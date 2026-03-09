import httpx
import os
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv()

API_KEY = os.environ["FLEETSMART_API_KEY"]
API_URL = os.environ["FLEETSMART_API_URL"]
HEADERS = {"X-API-KEY": API_KEY, "Content-Type": "application/json"}

mcp = FastMCP("Fleetsmart")


@mcp.tool()
async def list_vehicles() -> str:
    """List all vehicles in the fleet with their current status."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/vehicles", headers=HEADERS)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_drivers() -> str:
    """List all drivers."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/drivers", headers=HEADERS)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_live_views() -> str:
    """List current live status for all vehicles (moving, stopped, idle, etc)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/live_views", headers=HEADERS)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_harsh_events(from_date: str = None, to_date: str = None) -> str:
    """List harsh driving events. Optionally filter by date range (ISO format, e.g. 2026-03-01)."""
    params = {}
    if from_date:
        params["filter[date_time][gte]"] = from_date
    if to_date:
        params["filter[date_time][lte]"] = to_date
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/harsh_events", headers=HEADERS, params=params)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_vehicle_locations(vehicle_id: int = None) -> str:
    """List vehicle location history. Optionally filter by vehicle_id."""
    params = {}
    if vehicle_id:
        params["filter[vehicle_id]"] = vehicle_id
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/vehicle_locations", headers=HEADERS, params=params)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_pois() -> str:
    """List all Points of Interest (POIs)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/pois", headers=HEADERS)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_devices() -> str:
    """List all tracking devices and their battery status."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/devices", headers=HEADERS)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_io_events(vehicle_id: int = None, description: str = None) -> str:
    """List IO events (ignition on/off and other inputs). Optionally filter by description (e.g. 'Ignition')."""
    params = {}
    if vehicle_id:
        params["filter[vehicle_id]"] = vehicle_id
    if description:
        params["filter[description]"] = description
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/io_events", headers=HEADERS, params=params)
        response.raise_for_status()
        return str(response.json())


@mcp.tool()
async def list_poi_events(vehicle_id: int = None) -> str:
    """List POI events (when vehicles entered or exited geofenced locations)."""
    params = {}
    if vehicle_id:
        params["filter[vehicle_id]"] = vehicle_id
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/api/poi_events", headers=HEADERS, params=params)
        response.raise_for_status()
        return str(response.json())


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
