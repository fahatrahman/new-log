// src/components/FindBloodBank.js
import React, { useEffect, useMemo, useState } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";

const MIN_QUERY_LEN = 2;
const PAGE_LIMIT = 20;

export default function FindBloodBank() {
  const [qtext, setQtext] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

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
      if (qtext.trim().length < MIN_QUERY_LEN) {
        setResults([]);
        return;
      }
      setLoading(true);
      await new Promise((r) => debounce(r, 300));

      try {
        // Fast path: keyword array (no composite index)
        const q1 = query(
          collection(db, "BloodBanks"),
          where("searchKeywords", "array-contains", qtext.toLowerCase()),
          limit(PAGE_LIMIT)
        );
        const snap1 = await getDocs(q1);
        let rows = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Fallback: client filter if keyword array not present yet
        if (rows.length === 0) {
          const snap2 = await getDocs(collection(db, "BloodBanks"));
          rows = snap2.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((b) => {
              const hay = `${b.name || ""} ${b.address || b.location || ""} ${
                b.city || ""
              }`
                .toLowerCase()
                .trim();
              return hay.includes(qtext.toLowerCase());
            });
        }

        // client-side sort
        rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        if (!cancelled) setResults(rows);
      } catch (e) {
        console.error("FindBloodBank error:", e);
        if (!cancelled) setErr("Search failed.");
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
        placeholder='Type a bank name, city, or area (e.g., "Quantum")'
      />

      {qtext.trim().length < MIN_QUERY_LEN && (
        <p className="text-sm text-gray-600 mt-3">
          Start typing to search blood banks…
        </p>
      )}

      {qtext.trim().length >= MIN_QUERY_LEN && loading && (
        <p className="text-sm text-gray-600 mt-3">Searching…</p>
      )}

      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

      {qtext.trim().length >= MIN_QUERY_LEN &&
        !loading &&
        !err &&
        results.length === 0 && (
          <p className="text-sm text-gray-600 mt-3">No matches found.</p>
        )}

      {results.length > 0 && (
        <ul className="divide-y border rounded mt-3">
          {results.map((b) => (
            <li
              key={b.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/bloodbank/${b.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/bloodbank/${b.id}`);
              }}
              className="p-3 hover:bg-gray-50 cursor-pointer focus:outline-none focus:bg-gray-100"
              title="View bank details"
            >
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
