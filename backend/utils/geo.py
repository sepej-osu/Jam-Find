import math
from typing import Any, Optional, Tuple


def miles_between(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 3958.7613
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))


def get_coords_from_location(loc: Any) -> Tuple[Optional[float], Optional[float]]:
    if not isinstance(loc, dict):
        return None, None
    lat = loc.get("lat")
    lng = loc.get("lng")
    if lat is None or lng is None:
        return None, None
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except Exception:
        return None, None
    if abs(lat_f) < 0.000001 and abs(lng_f) < 0.000001:
        return None, None
    return lat_f, lng_f


def has_real_coords(loc: Any) -> bool:
    lat, lng = get_coords_from_location(loc)
    return lat is not None and lng is not None