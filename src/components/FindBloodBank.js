import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";

export default function FindBloodBank() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const MIN_CHARS = 1; // show results only when search length >= MIN_CHARS
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "BloodBanks"));
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBanks(rows);
      } catch (e) {
        console.error("Could not load blood banks:", e);
        setErr("Could not load blood banks.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (q.length < MIN_CHARS) return [];
    return banks.filter((b) => {
      const name = (b.name || "").toLowerCase();
      const addr = (b.address || b.location || b.city || "").toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [banks, q]);

  const openFirstIfEnter = (e) => {
    if (e.key === "Enter" && filtered.length > 0) {
      navigate(`/bloodbank/${filtered[0].id}`);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Find Nearest Blood Bank</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={openFirstIfEnter}
        placeholder="Type a bank name or address…"
        className="border p-2 rounded w-full mb-3"
      />

      {/* Only render the list after the user starts typing */}
      {q.length >= MIN_CHARS ? (
        filtered.length === 0 ? (
          <div className="text-sm text-gray-600">No matches.</div>
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
        )
      ) : null}
    </div>
  );
}
