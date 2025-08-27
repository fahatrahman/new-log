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

  useEffect(() => {
    factTimer.current = setInterval(
      () => setFactIdx((i) => (i + 1) % facts.length),
      5000
    );
    return () => clearInterval(factTimer.current);
  }, [facts.length]);

  // --- PUBLIC COUNTS (shows even when logged out) ---
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

  // Blood bank count (works publicly)
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

  // Eligibility + alerts (unchanged)
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

  // OPTIONAL live overrides (if rules allow — otherwise public values remain)
  useEffect(() => {
    (async () => {
      // live donor count
      try {
        const donorsQ = query(
          collection(db, "Users"),
          where("role", "in", ["user", "donor"])
        );
        const donorsCountSnap = await getCountFromServer(donorsQ);
        setDonorCount(donorsCountSnap.data().count);
      } catch (e) {
        // ignore — public value stays
      }

      // live units (last 30d)
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
      } catch (e) {
        // ignore — public value stays
      }
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
            <Link
              to="/request-blood"
              className="bg-white text-red-600 font-semibold px-4 py-2 rounded-md shadow hover:bg-red-50"
            >
              Request Blood
            </Link>
            <Link
              to="/schedule-donation"
              className="bg-red-600/90 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-red-700"
            >
              Become a Donor
            </Link>
            <a
              href="#find"
              className="bg-white/10 text-white font-semibold px-4 py-2 rounded-md border border-white/30 hover:bg-white/20"
            >
              Find Blood Bank
            </a>
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

      {/* FIND BLOOD BANK */}
      <div id="find" className="max-w-5xl mx-auto px-4 w-full mt-8">
        <FindBloodBank />
      </div>

      {/* DRIVES (optional – keep if you use it) */}
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
      <div className="max-w-5xl mx-auto px-4 w-full mt-10 mb-12">
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

      <footer className="bg-gray-900 text-gray-300 text-center py-4 mt-auto text-sm">
        &copy; {new Date().getFullYear()} Amar Rokto. All rights reserved.
      </footer>
    </div>
  );
}
