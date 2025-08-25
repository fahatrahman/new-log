// src/components/BloodBankDetail.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; // <-- Link added
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import MapFromAddress from "./MapFromAddress";

const mapLinkForBank = (bank) => {
  const q = `${bank?.name || ""} ${bank?.address || bank?.location || bank?.city || ""}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

const GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function BloodBankDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "BloodBanks", id));
        if (snap.exists()) setBank({ id: snap.id, ...snap.data() });
        else setBank(null);
      } catch (e) {
        console.error("Load bank failed:", e);
        setBank(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const stock = useMemo(
    () => (bank?.bloodStock && typeof bank.bloodStock === "object" ? bank.bloodStock : {}),
    [bank]
  );

  if (loading) return <div className="p-6">Loading…</div>;
  if (!bank) return <div className="p-6">Blood bank not found.</div>;

  const StockTile = ({ label, units }) => {
    const u = Number(units || 0);
    let bg = "bg-gray-100 text-gray-600 border border-gray-200";
    if (u <= 2) bg = "bg-red-100 text-red-700 border border-red-200";
    else if (u >= 3) bg = "bg-green-100 text-green-700 border border-green-200";
    return (
      <div className={`rounded-lg flex flex-col items-center justify-center py-6 shadow-sm ${bg}`}>
        <div className="text-xl font-bold">{label}</div>
        <div className="text-lg">{u} {u === 1 ? "unit" : "units"}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button className="text-white/90 hover:text-white text-sm mb-4" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">{bank.name || "Blood Bank"}</h1>
          <div className="mt-2 text-white/90 text-sm">{bank.address || bank.location || "Address not provided"}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {/* INTERNAL LINKS -> Link */}
            <Link
              to="/request-blood"
              className="inline-flex items-center px-4 py-2 rounded-md bg-white text-red-600 font-semibold hover:bg-red-50"
            >
              Request Blood
            </Link>
            <Link
              to="/schedule-donation"
              className="inline-flex items-center px-4 py-2 rounded-md bg-black/20 text-white font-semibold hover:bg-black/30"
            >
              Schedule Donation
            </Link>
            {/* EXTERNAL stays <a> */}
            <a
              href={mapLinkForBank(bank)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-md border border-white/40 text-white/95 font-semibold hover:bg-white/10"
            >
              Open in Maps
            </a>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-semibold mb-2">Contact</div>
          {bank.contact || bank.email ? (
            <div className="space-y-1 text-gray-800">
              {bank.contact && <div>📞 {bank.contact}</div>}
              {bank.email && <div>📧 {bank.email}</div>}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No contact info provided.</div>
          )}
        </div>

        {/* Stock Grid */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-semibold mb-3">Available Blood Units</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-4">
            {GROUPS.map((g) => (
              <StockTile key={g} label={g} units={stock[g]} />
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Location</div>
            <a
              href={mapLinkForBank(bank)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Open in Google Maps
            </a>
          </div>
          <MapFromAddress bank={bank} height="300px" hideTitle />
        </div>
      </div>
    </div>
  );
}
