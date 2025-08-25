// src/components/FindBloodBank.js
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";

export default function FindBloodBank() {
  const [bloodBanks, setBloodBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "BloodBanks"));
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBloodBanks(rows);
      } catch (e) {
        console.error("Error fetching blood banks:", e);
        setErr("Could not load blood banks.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Normalize once
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return bloodBanks.filter((bank) => {
      const name = (bank.name || "").toLowerCase();
      const address =
        (bank.address || bank.location || bank.city || "").toLowerCase();

      // handle bloodGroups as array or string; compare case‑insensitively
      const groups = Array.isArray(bank.bloodGroups)
        ? bank.bloodGroups.map((g) => String(g).toUpperCase())
        : String(bank.bloodGroups || "").toUpperCase();

      const matchesSearch = !q || name.includes(q) || address.includes(q);
      const matchesFilter = !filter
        ? true
        : Array.isArray(groups)
        ? groups.includes(filter.toUpperCase())
        : groups.includes(filter.toUpperCase());

      return matchesSearch && matchesFilter;
    });
  }, [bloodBanks, q, filter]);

  if (loading) return <div className="p-4">Loading blood banks…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Find Nearest Blood Bank</h1>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by name or address…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded w-full mb-3"
      />

      {/* Dropdown filter */}
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      >
        <option value="">Filter by Blood Group</option>
        <option value="A+">A+</option>
        <option value="A-">A-</option>
        <option value="B+">B+</option>
        <option value="B-">B-</option>
        <option value="O+">O+</option>
        <option value="O-">O-</option>
        <option value="AB+">AB+</option>
        <option value="AB-">AB-</option>
      </select>

      {/* List of results */}
      {filtered.length === 0 ? (
        <div className="text-sm text-gray-600">No matching blood banks.</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((bank) => (
            <li
              key={bank.id}
              onClick={() => navigate(`/bloodbank/${bank.id}`)}
              className="p-3 border rounded cursor-pointer hover:bg-gray-100"
            >
              <h2 className="font-semibold">{bank.name || "Blood Bank"}</h2>
              <p className="text-sm text-gray-600">
                {bank.address || bank.location || bank.city || "Location N/A"}
              </p>
              {bank.contact && (
                <p className="text-xs text-gray-500 mt-1">📞 {bank.contact}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
