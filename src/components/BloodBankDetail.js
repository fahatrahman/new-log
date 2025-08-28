// src/components/BloodBankDetail.js
import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import MapFromAddress from "./MapFromAddress";
import Modal from "./Modal"; // ← uses the hooks-safe Modal you added

// Lazy-load the existing page components so we can render them inside modals.
// If your filenames differ, adjust these two lines only.
const RequestBlood = lazy(() => import("./RequestBlood"));
const ScheduleDonation = lazy(() => import("./ScheduleDonation"));

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

  // Popup state
  const [showRequest, setShowRequest] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

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
    let tone = "bg-white border border-gray-200 text-gray-800 shadow-sm";
    if (u <= 2) tone = "bg-red-50 border border-red-200 text-red-700 shadow-sm";
    else if (u >= 3) tone = "bg-green-50 border border-green-200 text-green-700 shadow-sm";

    return (
      <div className={`rounded-xl py-5 px-4 flex flex-col items-center ${tone}`}>
        <div className="text-base font-semibold">{label}</div>
        <div className="mt-1 text-lg font-bold">
          {u} {u === 1 ? "unit" : "units"}
        </div>
      </div>
    );
  };

  const supportedCount = Object.values(stock).filter((v) => v !== undefined).length;

  return (
    <div className="min-h-screen font-sans">
      {/* HERO / HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-7">
          <button
            className="text-white/90 hover:text-white text-sm mb-3"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {bank.name || "Blood Bank"}
              </h1>
              <div className="mt-1 text-white/90 text-sm">
                {bank.address || bank.location || "Address not provided"}
              </div>
            </div>

            {/* Quick Actions (right) */}
            <div className="flex flex-wrap gap-2">
              {/* Open Request form in modal */}
              <button
                type="button"
                onClick={() => setShowRequest(true)}
                className="inline-flex items-center px-4 py-2 rounded-md bg-white text-red-600 font-semibold shadow hover:bg-red-50"
              >
                Request Blood
              </button>
              {/* Open Schedule form in modal */}
              <button
                type="button"
                onClick={() => setShowSchedule(true)}
                className="inline-flex items-center px-4 py-2 rounded-md bg-black/20 text-white font-semibold hover:bg-black/30"
              >
                Schedule Donation
              </button>
              <a
                href={mapLinkForBank(bank)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-md border border-white/40 text-white/95 font-semibold hover:bg-white/10"
              >
                Open in Maps
              </a>

              {/* Accessible fallbacks for non-JS users (kept but visually hidden) */}
              <Link to="/request-blood" className="sr-only">Request Blood (fallback)</Link>
              <Link to="/schedule-donation" className="sr-only">Schedule Donation (fallback)</Link>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5">
            <div className="text-sm text-gray-500 font-semibold">Supported Groups</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{supportedCount}</div>
            <div className="mt-2 text-xs text-gray-500">Total groups with any recorded stock.</div>
          </div>

          <div className="bg-red-50 rounded-2xl shadow-lg border border-red-200 p-5">
            <div className="text-sm text-red-700 font-semibold">City</div>
            <div className="mt-1 text-2xl font-bold text-red-800">{bank.city || "—"}</div>
            <div className="mt-2 text-xs text-red-700/80">City information (if provided by the bank).</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5">
            <div className="text-sm text-gray-500 font-semibold">Contact Status</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {bank.contact || bank.email ? "Available" : "Missing"}
            </div>
            <div className="mt-2 text-xs text-gray-500">Phone and/or email presence.</div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Overview + Contact */}
          <div className="space-y-6 lg:col-span-1">
            {/* Overview Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5">
              <div className="text-sm font-semibold text-gray-700 mb-2">Overview</div>
              <div className="text-sm text-gray-700">
                {bank.description ? (
                  <p className="leading-relaxed">{bank.description}</p>
                ) : (
                  <p className="text-gray-500">No description provided.</p>
                )}
              </div>
              {bank.website && (
                <a
                  href={bank.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-4 text-sm font-semibold text-red-600 hover:underline"
                >
                  Visit Website →
                </a>
              )}
            </div>

            {/* Contact Card */}
            <div className="bg-red-50 rounded-2xl border border-red-200 shadow-lg p-5">
              <div className="text-sm font-semibold text-red-800 mb-2">Contact</div>
              {bank.contact || bank.email ? (
                <div className="space-y-1 text-red-900">
                  {bank.contact && <div>📞 {bank.contact}</div>}
                  {bank.email && <div>📧 {bank.email}</div>}
                  {bank.address && <div>📍 {bank.address}</div>}
                </div>
              ) : (
                <div className="text-red-700/80 text-sm">No contact info provided.</div>
              )}
            </div>
          </div>

          {/* Right: Stock + Map */}
          <div className="space-y-6 lg:col-span-2">
            {/* Stock Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700">Available Blood Units</div>
                <div className="text-xs text-gray-500">Updated as recorded by the bank</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {GROUPS.map((g) => (
                  <StockTile key={g} label={g} units={stock[g]} />
                ))}
              </div>
            </div>

            {/* Map Card */}
            <div className="bg-red-50 rounded-2xl border border-red-200 shadow-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-red-800">Location</div>
                <a
                  href={mapLinkForBank(bank)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-md border border-red-300 text-red-800 hover:bg-red-100"
                >
                  Open in Google Maps
                </a>
              </div>
              <MapFromAddress bank={bank} height="320px" hideTitle />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- POPUP FORMS ---------- */}
      <Modal
        open={showRequest}
        onClose={() => setShowRequest(false)}
        title="Request Blood"
        maxWidth="max-w-2xl"
      >
        <Suspense fallback={<div className="p-4">Loading form…</div>}>
          {/* Pass bank context if your form supports it */}
          <RequestBlood defaultBankId={id} defaultBloodBankName={bank.name} />
        </Suspense>
      </Modal>

      <Modal
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        title="Schedule a Donation"
        maxWidth="max-w-2xl"
      >
        <Suspense fallback={<div className="p-4">Loading form…</div>}>
          {/* Pass bank context if your form supports it */}
          <ScheduleDonation defaultBankId={id} defaultBloodBankName={bank.name} />
        </Suspense>
      </Modal>
    </div>
  );
}
