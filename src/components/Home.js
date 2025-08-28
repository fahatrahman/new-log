// src/components/Home.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  getCountFromServer,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import bannerImage from "../ban.jpg";
import { Users, Droplet, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import FindBloodBank from "./FindBloodBank";
import PreFooterShowcase from "./PreFooterShowcase";
import AppFooter from "./AppFooter";

// ✨ NEW: modal + form components (make sure these files exist)
import Modal from "./Modal";
import RequestBlood from "./RequestBlood";
import ScheduleDonation from "./ScheduleDonation";

// Footer carousel images (kept in src/)
import slide0 from "../beforefooter.jpg";
import slide1 from "../beforefooter1.jpg";
import slide2 from "../beforefooter2.jpg";
import slide3 from "../beforefooter3.jpg";
import slide4 from "../beforefooter4.jpg";

/* --- Simple footer carousel (auto-play, arrows, dots) --- */
function FooterCarousel() {
  const sliderImages = [slide0, slide1, slide2, slide3, slide4];
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setIdx((i) => (i + 1) % sliderImages.length);
    }, 4000);
    return () => clearInterval(timer.current);
  }, [sliderImages.length]);

  const go = (n) => setIdx((n + sliderImages.length) % sliderImages.length);

  return (
    <div className="relative max-w-6xl mx-auto w-full px-4 mt-12 mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 shadow">
        <div className="relative h-[260px] sm:h-[360px] md:h-[420px]">
          {sliderImages.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Slide ${i + 1}`}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === idx ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        {/* arrows */}
        <button
          type="button"
          aria-label="Previous"
          onClick={() => go(idx - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-lg px-3 py-2 shadow"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => go(idx + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-lg px-3 py-2 shadow"
        >
          ›
        </button>

        {/* dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {sliderImages.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === idx ? "bg-red-600" : "bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [showEligibilityBanner, setShowEligibilityBanner] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [alerts, setAlerts] = useState([]);

  // KPIs
  const [donorCount, setDonorCount] = useState(0);
  const [banksCount, setBanksCount] = useState(0);
  const [unitsDelivered30d, setUnitsDelivered30d] = useState(0);

  const [drives, setDrives] = useState([]);

  const facts = useMemo(
    () => [
      "You can donate whole blood every 90 days.",
      "O− is the universal donor; AB+ is the universal recipient.",
      "One donation can help save up to three lives.",
      "Stay hydrated and eat iron-rich foods before donating.",
    ],
    []
  );
  const [factIdx, setFactIdx] = useState(0);
  const factTimer = useRef(null);

  // ✨ NEW: modal toggles
  const [openRequest, setOpenRequest] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);

  useEffect(() => {
    factTimer.current = setInterval(
      () => setFactIdx((i) => (i + 1) % facts.length),
      5000
    );
    return () => clearInterval(factTimer.current);
  }, [facts.length]);

  // --- PUBLIC COUNTS ---
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "stats", "global"));
        if (snap.exists()) {
          const data = snap.data() || {};
          if (typeof data.donorsCount === "number") setDonorCount(data.donorsCount);
          if (typeof data.unitsDelivered30d === "number")
            setUnitsDelivered30d(data.unitsDelivered30d);
        }
      } catch (e) {
        console.warn("stats/global read failed:", e);
      }
    })();
  }, []);

  // Blood bank count
  useEffect(() => {
    (async () => {
      try {
        const cnt = await getCountFromServer(collection(db, "BloodBanks"));
        setBanksCount(cnt.data().count);
      } catch (err) {
        console.error("Error counting blood banks:", err);
      }
    })();
  }, []);

  // Eligibility + alerts
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setShowEligibilityBanner(false);
        setCheckingEligibility(false);
        try {
          const qAll = query(collection(db, "alerts"), where("active", "==", true));
          const all = await getDocs(qAll);
          setAlerts(all.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn("alerts read failed (probably rules):", e);
        }
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "Users", u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const passed = data?.eligibility?.passed;
          setShowEligibilityBanner(passed !== true);

          const activeQ = query(collection(db, "alerts"), where("active", "==", true));
          const snap = await getDocs(activeQ);
          const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const preferred = all.filter(
            (a) =>
              (!data.city ||
                a.city?.toLowerCase() === data.city?.toLowerCase()) &&
              (!data.bloodGroup || a.bloodGroup === data.bloodGroup)
          );
          setAlerts(preferred.length ? preferred : all);
        } else {
          setShowEligibilityBanner(false);
        }
      } catch (e) {
        console.error("eligibility/alerts load error:", e);
      } finally {
        setCheckingEligibility(false);
      }
    });
    return () => unsub();
  }, []);

  // OPTIONAL live overrides
  useEffect(() => {
    (async () => {
      try {
        const donorsQ = query(
          collection(db, "Users"),
          where("role", "in", ["user", "donor"])
        );
        const donorsCountSnap = await getCountFromServer(donorsQ);
        setDonorCount(donorsCountSnap.data().count);
      } catch {}

      try {
        const start30 = new Date();
        start30.setDate(start30.getDate() - 30);

        const reqQ = query(
          collection(db, "blood_requests"),
          where("timestamp", ">=", Timestamp.fromDate(start30)),
          orderBy("timestamp", "desc")
        );
        const boundedSnap = await getDocs(reqQ);
        const reqRows = boundedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const dateFrom = (r) => {
          const raw = r?.date || r?.timestamp;
          if (!raw) return null;
          if (typeof raw === "string") {
            const p = new Date(raw);
            return isNaN(p.getTime()) ? null : p;
          }
          if (raw?.seconds) return new Date(raw.seconds * 1000);
          return null;
        };

        const units = reqRows.reduce((sum, r) => {
          const approved = (r.status || "pending").toLowerCase() === "approved";
          const dt = dateFrom(r);
          if (!approved || !dt || dt < start30) return sum;
          const u = Number(r.units || 0);
          return sum + (isNaN(u) ? 0 : u);
        }, 0);
        setUnitsDelivered30d(units);
      } catch {}
    })();
  }, []);

  const sevClass = (s) =>
    s === "emergency"
      ? "bg-red-700 text-white"
      : s === "high"
      ? "bg-red-600 text-white"
      : s === "medium"
      ? "bg-yellow-500 text-black"
      : "bg-gray-300 text-black";

  return (
    <div className="min-h-screen flex flex-col">
      {/* HERO */}
      <div className="relative h-[22rem] md:h-[26rem] w-full overflow-hidden">
        <img
          src={bannerImage}
          alt="Donate blood"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-w-5xl mx-auto h-full px-4 flex flex-col items-start justify-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Save Lives Today
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/90 max-w-xl">
            Request blood when you need it, or schedule a donation with nearby
            blood banks. Every drop matters.
          </p>
          <div className="mt-4 flex gap-2">
            {/* ✨ Open forms in modal instead of navigating */}
            <button
              type="button"
              onClick={() => setOpenRequest(true)}
              className="bg-white text-red-600 font-semibold px-4 py-2 rounded-md shadow hover:bg-red-50"
            >
              Request Blood
            </button>
            <button
              type="button"
              onClick={() => setOpenSchedule(true)}
              className="bg-red-600/90 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-red-700"
            >
              Become a Donor
            </button>
            {/* “Find Blood Bank” CTA intentionally removed as requested */}
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="max-w-5xl mx-auto w-full px-4 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
            <div className="bg-red-100 text-red-600 rounded-full h-12 w-12 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Total Donors</div>
              <div className="text-2xl font-bold mt-0.5">{donorCount}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
            <div className="bg-red-100 text-red-600 rounded-full h-12 w-12 flex items-center justify-center">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">
                Units Delivered (30d)
              </div>
              <div className="text-2xl font-bold mt-0.5">{unitsDelivered30d}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
            <div className="bg-red-100 text-red-600 rounded-full h-12 w-12 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Blood Banks</div>
              <div className="text-2xl font-bold mt-0.5">{banksCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 w-full mt-6">
          <h2 className="text-xl font-semibold mb-3">Urgent Alerts Near You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.slice(0, 6).map((a) => (
              <div key={a.id} className="rounded border p-3 bg-white shadow-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${sevClass(
                      a.severity
                    )}`}
                  >
                    {a.severity?.toUpperCase() || "ALERT"}
                  </span>
                  <span className="font-bold">{a.bloodGroup}</span>
                  <span className="text-gray-600 text-sm">· {a.city}</span>
                </div>
                <p className="text-sm mt-1">{a.message}</p>
                {a.bankName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Posted by: {a.bankName}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIND BLOOD BANK (section stays) */}
      <div id="find" className="max-w-5xl mx-auto px-4 w-full mt-8">
        <FindBloodBank />
      </div>

      {/* DRIVES (optional) */}
      {drives.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 w-full mt-10">
          <h2 className="text-xl font-semibold mb-3">Upcoming Blood Drives</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {drives.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="text-sm font-semibold">
                  {d.bankName || "Blood Bank"}
                </div>
                <div className="text-xs text-gray-500">
                  {d._when?.toLocaleString() || "TBA"}
                </div>
                {d.city && (
                  <div className="text-xs text-gray-500">City: {d.city}</div>
                )}
                <Link
                  to="/schedule-donation"
                  className="mt-3 inline-block text-sm bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700"
                >
                  Join / Schedule
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FACTS */}
      <div className="max-w-5xl mx-auto px-4 w-full mt-10">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">💡</div>
            <div className="text-sm md:text-base">
              <span className="font-semibold">Did you know?</span>{" "}
              {facts[factIdx]}
            </div>
          </div>
          <div className="hidden md:flex gap-1">
            {facts.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === factIdx ? "bg-red-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <PreFooterShowcase />

      {/* NEW: image carousel just before the footer */}
      <FooterCarousel />

      <AppFooter />

      {/* ✨ MODALS */}
      <Modal
        open={openRequest}
        onClose={() => setOpenRequest(false)}
        title="Request Blood"
        maxWidth="max-w-3xl"
      >
        {/* If RequestBlood supports an onDone callback, it'll close on success */}
        <RequestBlood inModal onDone={() => setOpenRequest(false)} />
      </Modal>

      <Modal
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        title="Schedule Donation"
        maxWidth="max-w-3xl"
      >
        {/* If ScheduleDonation supports an onDone callback, it'll close on success */}
        <ScheduleDonation inModal onDone={() => setOpenSchedule(false)} />
      </Modal>
    </div>
  );
}
