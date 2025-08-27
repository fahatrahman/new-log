// src/components/FindBloodBank.js
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

const MIN_QUERY_LEN = 2;
const PAGE_LIMIT = 20;

export default function FindBloodBank() {
  const [qtext, setQtext] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // tiny debounce helper
  const useDebounce = () => {
    let t;
    return (fn, ms = 300) => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  };
  const debounce = useMemo(useDebounce, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setErr("");
      // show nothing by default until user types at least 2 chars
      if (qtext.trim().length < MIN_QUERY_LEN) {
        setResults([]);
        return;
      }
      setLoading(true);

      await new Promise((r) => debounce(r, 300)); // 300ms debounce

      try {
        // NOTE: collection name matches your DB exactly: "BloodBanks"
        // Requires banks to store a lowercased token array: searchKeywords: string[]
        const q = query(
          collection(db, "BloodBanks"),
          where("searchKeywords", "array-contains", qtext.toLowerCase()),
          orderBy("name"),
          limit(PAGE_LIMIT)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
        setErr(
          "Search failed. If Firestore asks for an index, click its link once to create it."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [qtext, debounce]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <label className="block text-sm font-medium mb-1">Find Blood Bank</label>
      <input
        value={qtext}
        onChange={(e) => setQtext(e.target.value)}
        className="w-full border rounded px-3 py-2"
        placeholder='Type a bank name, city, or area (e.g., "Banani")'
      />

      {/* empty state */}
      {qtext.trim().length < MIN_QUERY_LEN && (
        <p className="text-sm text-gray-600 mt-3">
          Start typing to search blood banks…
        </p>
      )}

      {/* loading */}
      {qtext.trim().length >= MIN_QUERY_LEN && loading && (
        <p className="text-sm text-gray-600 mt-3">Searching…</p>
      )}

      {/* error */}
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

      {/* results */}
      {qtext.trim().length >= MIN_QUERY_LEN && !loading && !err && results.length === 0 && (
        <p className="text-sm text-gray-600 mt-3">No matches found.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y border rounded mt-3">
          {results.map((b) => (
            <li key={b.id} className="p-3">
              <div className="font-medium">{b.name || "Unnamed Bank"}</div>
              <div className="text-sm text-gray-600">
                {(b.address || b.location || "")}
                {b.city ? `, ${b.city}` : ""}
              </div>
              {b.contactNumber && (
                <div className="text-sm text-gray-600">
                  Phone: {b.contactNumber}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/*
To power this search, ensure each BloodBanks doc has:

const tokens = (s) =>
  (s || "").toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);

const searchKeywords = Array.from(new Set([
  ...tokens(name),
  ...tokens(city),
  ...tokens(address),
  ...tokens(location),
  ...(Array.isArray(tags) ? tags.map(t => (t||"").toLowerCase()) : []),
]));

await setDoc(doc(db, "BloodBanks", uid), { searchKeywords }, { merge: true });

Then the query above will work fast with array-contains.
*/
