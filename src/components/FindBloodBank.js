import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import {
  MapPin,
  Crosshair,
  Search,
  X,
  SlidersHorizontal,
  Droplets,
} from "lucide-react";
import { Link } from "react-router-dom";

/* ---------- helpers ---------- */
function getLatLng(bank) {
  if (typeof bank?.lat === "number" && typeof bank?.lng === "number") {
    return { lat: bank.lat, lng: bank.lng };
  }
  if (bank?.geo && typeof bank.geo.latitude === "number") {
    return { lat: bank.geo.latitude, lng: bank.geo.longitude };
  }
  if (bank?.location && typeof bank.location.lat === "number") {
    return { lat: bank.location.lat, lng: bank.location.lng };
  }
  return null;
}

function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s1 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

const GROUPS = ["Any", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function bankHasGroup(bank, group) {
  if (!group || group === "Any") return true;
  const list = Array.isArray(bank.bloodGroups)
    ? bank.bloodGroups
    : Array.isArray(bank.bloodGroup)
    ? bank.bloodGroup
    : typeof bank.bloodGroup === "string"
    ? [bank.bloodGroup]
    : [];
  return list.map(String).includes(group);
}

/* ---------- component ---------- */
export default function FindBloodBank() {
  const [allBanks, setAllBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [queryText, setQueryText] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Any");

  const [usingLoc, setUsingLoc] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [locError, setLocError] = useState("");

  const [sortBy, setSortBy] = useState("best"); // best | distance | name | city
  const inputRef = useRef(null);

  /* load banks */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "BloodBanks"));
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllBanks(rows);
      } catch (e) {
        console.error("FindBloodBank load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* tokens for fuzzy search */
  const tokens = useMemo(
    () =>
      queryText
        .toLowerCase()
        .split(/[^a-z0-9+]+/i)
        .filter(Boolean),
    [queryText]
  );

  /* filter + rank */
  const results = useMemo(() => {
    if (!allBanks.length) return [];

    let pool = allBanks.filter((b) => bankHasGroup(b, selectedGroup));

    if (tokens.length) {
      pool = pool
        .map((b) => {
          const hay =
            `${b.name || ""} ${b.city || ""} ${b.address || b.location || ""} ${
              (b.searchKeywords || []).join(" ")
            }`.toLowerCase();
          let score = 0;
          tokens.forEach((t) => {
            if (hay.includes(t)) score += 1;
          });
          return { bank: b, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.bank);
    }

    if (usingLoc && userLoc) {
      pool = pool
        .map((b) => {
          const ll = getLatLng(b);
          return ll ? { ...b, _dist: distanceKm(userLoc, ll) } : b;
        })
        .filter((b) => (typeof b._dist === "number" ? b._dist <= radiusKm : true));
    }

    const by = sortBy === "distance" && !(usingLoc && userLoc) ? "best" : sortBy;
    if (by === "distance") pool.sort((a, b) => (a._dist ?? 1e9) - (b._dist ?? 1e9));
    if (by === "name") pool.sort((a, b) => String(a.name || "").localeCompare(b.name || ""));
    if (by === "city") pool.sort((a, b) => String(a.city || "").localeCompare(b.city || ""));

    return pool.slice(0, 24);
  }, [allBanks, tokens, selectedGroup, usingLoc, userLoc, radiusKm, sortBy]);

  /* location */
  const handleUseLocation = () => {
    setLocError("");
    if (!("geolocation" in navigator)) {
      setLocError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingLoc(true);
        setSortBy("distance");
      },
      (err) => setLocError(err?.message || "Couldn’t get your location."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const clearQuery = () => {
    setQueryText("");
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      {/* title row */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Find Blood Bank</h2>
        <div className="flex items-center gap-2 text-sm">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500">Smart search & filters</span>
        </div>
      </div>

      {/* Elegant pill search bar */}
      <div className="relative">
        <div className="flex items-stretch w-full rounded-full bg-white dark:bg-neutral-900 shadow ring-1 ring-gray-200 dark:ring-neutral-700 focus-within:ring-red-300 dark:focus-within:ring-red-500 transition">
          <span className="pl-4 pr-2 flex items-center text-gray-500 dark:text-neutral-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            ref={inputRef}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder='Search by bank name, city, or area (e.g., "Quantum")'
            className="flex-1 rounded-l-none rounded-r-none bg-transparent outline-none text-[15px] placeholder-gray-400 dark:placeholder-neutral-500 py-3 text-gray-900 dark:text-neutral-100"
          />
          {!!queryText && (
            <button
              type="button"
              title="Clear"
              onClick={clearQuery}
              className="px-2 text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="h-8 my-2 w-px bg-gray-200 dark:bg-neutral-700" />
          <button
            type="button"
            onClick={handleUseLocation}
            title="Use my location"
            className="px-4 flex items-center gap-2 rounded-r-full bg-red-600 text-white font-semibold hover:bg-red-700"
          >
            <Crosshair className="w-4 h-4" />
            Nearby
          </button>
        </div>

        {/* filter row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* blood group chips */}
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-3 py-1.5 text-sm rounded-full border transition ${
                  selectedGroup === g
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200 border-gray-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-neutral-800"
                }`}
                title={g === "Any" ? "All blood groups" : `Filter: ${g}`}
              >
                <span className="inline-flex items-center gap-1">
                  {g !== "Any" && <Droplets className="w-3.5 h-3.5" />}
                  {g}
                </span>
              </button>
            ))}
          </div>

          {/* divider dot */}
          <span className="hidden sm:inline text-gray-300 dark:text-neutral-600">•</span>

          {/* location tools */}
          <div className="flex items-center gap-2 text-sm">
            {usingLoc && userLoc ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-400/30">
                  <MapPin className="w-4 h-4" />
                  Nearby
                </span>
                <label className="text-gray-700 dark:text-neutral-200">
                  Radius:
                  <select
                    className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                  >
                    {[5, 10, 15, 25, 50].map((km) => (
                      <option key={km} value={km}>
                        {km} km
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => setUsingLoc(false)}
                  className="text-xs font-semibold text-gray-600 dark:text-neutral-400 hover:underline"
                >
                  turn off
                </button>
              </>
            ) : (
              <span className="text-gray-500 dark:text-neutral-400">
                Tip: click <strong>Nearby</strong> to sort by distance.
              </span>
            )}
            {locError && (
              <span className="text-rose-600 dark:text-rose-400 font-medium">{locError}</span>
            )}
          </div>

          {/* sort */}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="text-gray-600 dark:text-neutral-300">Sort:</label>
            <select
              className="px-2 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="best">Best match</option>
              <option value="distance">Distance</option>
              <option value="name">Name</option>
              <option value="city">City</option>
            </select>
          </div>
        </div>
      </div>

      {/* results */}
      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-neutral-400">Loading blood banks…</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-neutral-400">
            No blood banks found. Try a different term, group or radius.
          </div>
        ) : (
          <>
            <div className="mb-2 text-xs text-gray-500 dark:text-neutral-400">
              Showing {results.length} result{results.length > 1 ? "s" : ""}.
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-sm p-4 flex items-start"
                >
                  <div className="mr-3 mt-0.5">
                    <div className="h-9 w-9 rounded-full bg-red-100 text-red-600 dark:bg-red-400/20 dark:text-red-300 flex items-center justify-center font-bold">
                      {String(b.name || "B")[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-gray-900 dark:text-neutral-100">
                      {b.name || "Blood Bank"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-neutral-300 truncate">
                      {(b.address || b.location || b.city || "Address not provided")}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-neutral-400 flex gap-2 items-center">
                      {b.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {b.city}
                        </span>
                      )}
                      {typeof b._dist === "number" && (
                        <span className="inline-flex items-center gap-1">
                          • {b._dist.toFixed(1)} km away
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/bloodbank/${b.id}`}
                    className="shrink-0 ml-3 self-center inline-flex px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
