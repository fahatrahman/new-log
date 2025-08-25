// src/components/MapFromAddress.js
import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// Fix default marker icons for Leaflet bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/**
 * Props:
 *  - bank: { id, name, address, city, lat?, lng? }
 *  - canWrite: boolean (owner/admin can write coords back)
 *  - height: string (e.g. "280px")
 *  - hideTitle: boolean (if true, don't render the "Location" label at top)
 */
export default function MapFromAddress({ bank, canWrite = false, height = "260px", hideTitle = false }) {
  const [pos, setPos] = useState(null);
  const [error, setError] = useState("");

  const queryText = useMemo(() => {
    const parts = [bank?.name, bank?.address || bank?.location, bank?.city].filter(Boolean).join(", ");
    return parts.trim();
  }, [bank?.name, bank?.address, bank?.location, bank?.city]);

  useEffect(() => {
    if (!bank) return;

    if (typeof bank.lat === "number" && typeof bank.lng === "number") {
      setPos({ lat: bank.lat, lng: bank.lng });
      return;
    }

    const cacheKey = bank?.id ? `geo:${bank.id}` : `geo:${queryText}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.lat && parsed?.lng) {
          setPos({ lat: parsed.lat, lng: parsed.lng });
          return;
        }
      } catch {}
    }

    if (!queryText) return;
    setError("");

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(queryText)}`;
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch(url, { headers: { Accept: "application/json" } });
        if (!resp.ok) throw new Error(`Geocode failed (${resp.status})`);
        const json = await resp.json();
        if (!Array.isArray(json) || json.length === 0) {
          setError("Location not found for this address.");
          return;
        }
        const lat = parseFloat(json[0].lat);
        const lng = parseFloat(json[0].lon);
        if (cancelled) return;
        setPos({ lat, lng });
        localStorage.setItem(cacheKey, JSON.stringify({ lat, lng, q: queryText }));

        if (canWrite && bank?.id && (typeof bank.lat !== "number" || typeof bank.lng !== "number")) {
          try {
            await updateDoc(doc(db, "BloodBanks", bank.id), { lat, lng });
          } catch (e) {
            console.warn("Firestore write-back skipped:", e?.message || e);
          }
        }
      } catch (e) {
        console.error("Geocode error:", e);
        setError("Could not load map for this address.");
      }
    })();

    return () => { cancelled = true; };
  }, [bank, queryText, canWrite]);

  if (!bank) return null;

  return (
    <div className="w-full">
      {!hideTitle && <div className="text-sm font-semibold mb-2">Location</div>}
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
        {pos ? (
          <MapContainer center={[pos.lat, pos.lng]} zoom={14} scrollWheelZoom={false} style={{ height }}>
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[pos.lat, pos.lng]}>
              <Popup>
                <div className="font-semibold">{bank?.name || "Blood Bank"}</div>
                <div className="text-xs text-gray-600">
                  {(bank?.address || bank?.location || bank?.city || "").toString()}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="p-4 text-sm">
            {error ? <span className="text-red-600">{error}</span> : "Locating this blood bank on the map…"}
          </div>
        )}
      </div>
    </div>
  );
}
