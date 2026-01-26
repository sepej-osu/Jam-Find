import { apiGet } from "./client";

export function geocodeAddress(address) {
  return apiGet(`/api/v1/location/geocode?address=${encodeURIComponent(address)}`);
}
