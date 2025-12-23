from shapely import wkt
from shapely.geometry import Polygon

def validate_polygon_wkt(polygon_wkt: str) -> Polygon:
    geom = wkt.loads(polygon_wkt)
    if not isinstance(geom, Polygon):
        raise ValueError("WKT must be a POLYGON")
    if not geom.is_valid:
        raise ValueError("Invalid polygon geometry")
    return geom
