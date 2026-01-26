import { useState } from "react";
import { geocodeAddress, reverseGeocode } from "../api/location";

export default function LocationPicker({ onSelect }) {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");

  async function handleGeocode() {
    setStatus("Looking up location...");
    try {
      const result = await geocodeAddress(address);
      setStatus(`Found: ${result.city}, ${result.state}`);
      onSelect?.(result); // send back to parent (profile form)
    } catch (e) {
      setStatus("Could not find that location.");
    }
  }

  async function handleUseMyLocation() {
    setStatus("Getting your GPS location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const result = await reverseGeocode(lat, lng);
          setStatus(`Found: ${result.city}, ${result.state}`);
          onSelect?.(result);
        } catch (e) {
          setStatus("Could not look up your location.");
        }
      },
      () => setStatus("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <label>Location (City or Address)</label>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Fort Myers, FL"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={handleGeocode} disabled={!address.trim()}>
          Search
        </button>
        <button type="button" onClick={handleUseMyLocation}>
          Use my location
        </button>
      </div>

      {status && <p style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
