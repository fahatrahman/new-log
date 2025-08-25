// src/components/Home.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import bannerImage from "../ban.jpg";
import { Users, Droplet, Building2 } from "lucide-react"; // ⬅️ add at top with other imports

export default function Home() {
  // --- Search ---
  const [searchTerm, setSearchTerm] = useState("");
  const [bloodBanks, setBloodBanks] = useState([]);
  const [filteredBanks, setFilteredBanks] = useState([]);

  // --- Eligibility banner ---
  const [showEligibilityBanner, setShowEligibilityBanner] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // --- Alerts ---
  const [alerts, setAlerts] = useState([]);

  // --- Impact stats ---
  const [donorCount, setDonorCount] = useState(0);
  const [banksCount, setBanksCount] = useState(0);
  const [unitsDelivered30d, setUnitsDelivered30d] = useState(0);

  // --- Upcoming drives ---
  const [drives, setDrives] = useState([]);

  // --- Small facts carousel ---
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
    // Rotate facts every 5s
    factTimer.current = setInterval(
      () => setFactIdx((i) => (i + 1) % facts.length),
      5000
    );
    return () => clearInterval(factTimer.current);
  }, [facts.length]);

  // Load blood banks list (for search + count)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "BloodBanks"));
        const banks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBloodBanks(banks);
        setBanksCount(banks.length);
      } catch (err) {
        console.error("Error fetching blood banks:", err);
      }
    })();
  }, []);

  // Load alerts + eligibility prompt for signed-in users
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setShowEligibilityBanner(false);
        setCheckingEligibility(false);
        const qAll = query(
          collection(db, "alerts"),
          where("active", "==", true)
        );
        const all = await getDocs(qAll);
        setAlerts(all.docs.map((d) => ({ id: d.id, ...d.data() })));
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "Users", u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const passed = data?.eligibility?.passed;
          setShowEligibilityBanner(passed !== true);

          // Show alerts (prefer city/group match)
          const activeQ = query(
            collection(db, "alerts"),
            where("active", "==", true)
          );
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

  // Load impact stats & upcoming drives
  useEffect(() => {
    (async () => {
      try {
        // Donors (users with role=user; fallback: all Users)
        const usersSnap = await getDocs(collection(db, "Users"));
        const donors = usersSnap.docs.filter(
          (d) => (d.data().role || "user") === "user"
        );
        setDonorCount(donors.length);

        // Units delivered in last 30 days (approved requests)
        const start30 = new Date();
        start30.setDate(start30.getDate() - 30);
        const ts30 = Timestamp.fromDate(start30);

        // Prefer timestamp filter, fallback to latest N if schema lacks timestamp
        let reqQ = query(
          collection(db, "blood_requests"),
          orderBy("timestamp", "desc"),
          where("timestamp", ">=", ts30),
          limit(500)
        );
        let reqSnap = await getDocs(reqQ);
        let reqRows = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (reqRows.length === 0) {
          const reqFallback = query(
            collection(db, "blood_requests"),
            orderBy("timestamp", "desc"),
            limit(500)
          );
          reqSnap = await getDocs(reqFallback);
          reqRows = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        const dateFromDoc = (r) => {
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
          const dt = dateFromDoc(r);
          if (!approved || !dt || dt < start30) return sum;
          const u = Number(r.units || 0);
          return sum + (isNaN(u) ? 0 : u);
        }, 0);
        setUnitsDelivered30d(units);

        // Upcoming drives (next 3 scheduled donations by date)
        const now = new Date();
        const donQ = query(
          collection(db, "donation_schedules"),
          orderBy("timestamp", "desc"),
          limit(400)
        );
        const donSnap = await getDocs(donQ);
        const rows = donSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const parsed = rows
          .map((d) => {
            // accept string or Timestamp date fields
            let dateVal = null;
            if (typeof d.date === "string") {
              const p = new Date(d.date);
              if (!isNaN(p.getTime())) dateVal = p;
            } else if (d.date?.seconds) {
              dateVal = new Date(d.date.seconds * 1000);
            } else if (d.timestamp?.seconds) {
              dateVal = new Date(d.timestamp.seconds * 1000);
            }
            return { ...d, _when: dateVal };
          })
          .filter(
            (d) =>
              d._when &&
              d._when >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) &&
              (d.status || "scheduled").toLowerCase() === "scheduled"
          )
          .sort((a, b) => a._when - b._when)
          .slice(0, 3);

        setDrives(parsed);
      } catch (e) {
        console.error("stats/drives load error:", e);
      }
    })();
  }, []);

  // --- Search handler ---
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim() === "") return setFilteredBanks([]);

    const filtered = bloodBanks.filter(
      (bank) =>
        (bank.name || "").toLowerCase().includes(value.toLowerCase()) ||
        (bank.address || bank.location || "")
          .toLowerCase()
          .includes(value.toLowerCase())
    );
    setFilteredBanks(filtered);
  };

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
      {/* HERO with overlay */}
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
            <a
              href="/request-blood"
              className="bg-white text-red-600 font-semibold px-4 py-2 rounded-md shadow hover:bg-red-50"
            >
              Request Blood
            </a>
            <a
              href="/schedule-donation"
              className="bg-red-600/90 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-red-700"
            >
              Become a Donor
            </a>
            <a
              href="#find"
              className="bg-white/10 text-white font-semibold px-4 py-2 rounded-md border border-white/30 hover:bg-white/20"
            >
              Find Blood Bank
            </a>
          </div>
        </div>
      </div>

      

{/* QUICK IMPACT STRIP */}
<div className="max-w-5xl mx-auto w-full px-4 mt-8">
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {/* Total Donors */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className="bg-red-100 text-red-600 rounded-full h-12 w-12 flex items-center justify-center">
        <Users className="w-6 h-6" />
      </div>
      <div>
        <div className="text-xs text-gray-500 uppercase">Total Donors</div>
        <div className="text-2xl font-bold mt-0.5">{donorCount}</div>
      </div>
    </div>

    {/* Units Delivered */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className="bg-red-100 text-red-600 rounded-full h-12 w-12 flex items-center justify-center">
        <Droplet className="w-6 h-6" />
      </div>
      <div>
        <div className="text-xs text-gray-500 uppercase">Units Delivered (30d)</div>
        <div className="text-2xl font-bold mt-0.5">{unitsDelivered30d}</div>
      </div>
    </div>

    {/* Blood Banks */}
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


      {/* ELIGIBILITY PROMPT */}
      {!checkingEligibility && showEligibilityBanner && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Complete your Donor Eligibility</p>
              <p className="text-sm">
                Before scheduling a donation, please complete the quick
                eligibility checklist.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href="/eligibility"
                className="px-3 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Check now
              </a>
              <button
                onClick={() => setShowEligibilityBanner(false)}
                className="px-3 py-2 rounded border border-yellow-300 text-yellow-900 text-sm hover:bg-yellow-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URGENT ALERTS */}
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
      <div id="find" className="max-w-xl mx-auto px-4 text-center mt-8">
        <h2 className="text-red-600 text-3xl font-semibold mb-4">
          Find Nearest Blood Bank
        </h2>
        <input
          type="text"
          placeholder="Search blood banks by name or address"
          value={searchTerm}
          onChange={handleSearchChange}
          className="input"
        />
        {filteredBanks.length > 0 && (
          <ul className="max-h-72 overflow-y-auto text-left bg-white border border-gray-300 rounded-md shadow-md mt-4">
            {filteredBanks.map((bank) => (
              <li
                key={bank.id}
                className="px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-red-50 transition"
              >
                <a href={`/bloodbank/${bank.id}`}>
                  <strong className="block">{bank.name}</strong>
                  <span className="text-sm text-gray-600">
                    {bank.address || bank.location || "Location N/A"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* UPCOMING DRIVES */}
      {drives.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 w-full mt-10">
          <h2 className="text-xl font-semibold mb-3">Upcoming Blood Drives</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {drives.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="text-sm font-semibold">
                  {d.bankName || "Blood Bank"}
                </div>
                <div className="text-xs text-gray-500">
                  {d._when?.toLocaleString() || "TBA"}
                </div>
                {d.city && (
                  <div className="text-xs text-gray-500">City: {d.city}</div>
                )}
                <a
                  href="/schedule-donation"
                  className="mt-3 inline-block text-sm bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700"
                >
                  Join / Schedule
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FACTS CAROUSEL */}
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
