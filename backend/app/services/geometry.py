from shapely import wkt
from shapely.geometry import Polygon
from fastapi import HTTPException

def validate_polygon_wkt(polygon_wkt: str) -> Polygon:
    try:
        geom = wkt.loads(polygon_wkt)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid WKT format: {str(e)}")

    if not isinstance(geom, Polygon):
        raise HTTPException(status_code=400, detail="WKT must be a POLYGON (not POINT, LINESTRING, etc.)")

    if not geom.is_valid:
        raise HTTPException(status_code=400, detail="Invalid polygon geometry - check that coordinates form a valid closed polygon")

    return geom
