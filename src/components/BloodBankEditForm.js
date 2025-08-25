// src/components/BloodBankEditForm.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "./firebase";
import { toast } from "react-toastify";

const GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

export default function BloodBankEditForm() {
  const { id } = useParams();             // bank id (uid)
  const navigate = useNavigate();
  const auth = getAuth();

  // --- Bank core data ---
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);

  // editable fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [bloodGroups, setBloodGroups] = useState([]); // supported groups
  const [stock, setStock] = useState({});             // { "A+": number, ... }
  const [logoUrl, setLogoUrl] = useState("");

  // --- Drives ---
  const [drives, setDrives] = useState([]);
  const [driveCity, setDriveCity] = useState("");
  const [driveDate, setDriveDate] = useState("");     // yyyy-mm-dd
  const [driveTime, setDriveTime] = useState("");     // HH:MM

  // --- Load hospital/bank doc & drives ---
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "BloodBanks", id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setBank(data);

          setName(data.name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setContact(data.contact || "");
          setEmail(data.email || "");
          setWebsite(data.website || "");
          setDescription(data.description || "");
          setBloodGroups(Array.isArray(data.bloodGroups) ? data.bloodGroups : []);
          setStock(typeof data.bloodStock === "object" && data.bloodStock ? data.bloodStock : {});
          setLogoUrl(data.logoUrl || "");
        } else {
          // create a stub doc if missing
          await setDoc(doc(db, "BloodBanks", id), {
            name: "Blood Bank",
            createdAt: new Date().toISOString(),
          });
          setBank({ id, name: "Blood Bank" });
        }

        // load drives for this bank
        const qDr = query(
          collection(db, "donation_schedules"),
          where("bankId", "==", id),
          orderBy("timestamp", "desc")
        );
        const drSnap = await getDocs(qDr);
        setDrives(drSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load blood bank.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // helpers
  const setStockUnits = (g, v) =>
    setStock((s) => ({ ...s, [g]: Math.max(0, Number.isFinite(v) ? v : 0) }));

  const inc = (g, by = 1) => setStockUnits(g, Number(stock[g] || 0) + by);
  const dec = (g, by = 1) => setStockUnits(g, Number(stock[g] || 0) - by);

  const toggleGroup = (g) =>
    setBloodGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  // --- Save details ---
  const saveDetails = async () => {
    try {
      await updateDoc(doc(db, "BloodBanks", id), {
        name: name.trim() || "Blood Bank",
        address: address.trim(),
        city: city.trim(),
        contact: contact.trim(),
        email: email.trim(),
        website: website.trim(),
        description: description.trim(),
        bloodGroups,
        updatedAt: serverTimestamp(),
      });
      toast.success("Details saved");
    } catch (e) {
      console.error(e);
      toast.error("Could not save details");
    }
  };

  // --- Save stock ---
  const saveStock = async () => {
    try {
      await updateDoc(doc(db, "BloodBanks", id), {
        bloodStock: stock,
        updatedAt: serverTimestamp(),
      });
      toast.success("Stock updated");
    } catch (e) {
      console.error(e);
      toast.error("Could not update stock");
    }
  };

  // --- Upload logo ---
  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const storage = getStorage();
      const r = ref(storage, `bloodbanks/${id}/logo_${Date.now()}.jpg`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateDoc(doc(db, "BloodBanks", id), { logoUrl: url, updatedAt: serverTimestamp() });
      setLogoUrl(url);
      toast.success("Logo uploaded");
    } catch (e) {
      console.error(e);
      toast.error("Logo upload failed");
    }
  };

  // --- Manage drives ---
  const addDrive = async () => {
    if (!driveDate || !driveTime) {
      toast.warn("Pick date and time");
      return;
    }
    try {
      const dt = new Date(`${driveDate}T${driveTime}:00`);
      await addDoc(collection(db, "donation_schedules"), {
        bankId: id,
        bankName: name || bank?.name || "Blood Bank",
        city: (driveCity || city || "").trim(),
        date: Timestamp.fromDate(dt),
        timestamp: serverTimestamp(),
        status: "scheduled",
      });
      setDriveCity("");
      setDriveDate("");
      setDriveTime("");
      // reload
      const qDr = query(
        collection(db, "donation_schedules"),
        where("bankId", "==", id),
        orderBy("timestamp", "desc")
      );
      const drSnap = await getDocs(qDr);
      setDrives(drSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      toast.success("Drive scheduled");
    } catch (e) {
      console.error(e);
      toast.error("Could not add drive");
    }
  };

  const cancelDrive = async (driveId) => {
    try {
      await deleteDoc(doc(db, "donation_schedules", driveId));
      setDrives((d) => d.filter((x) => x.id !== driveId));
      toast.success("Drive removed");
    } catch (e) {
      console.error(e);
      toast.error("Could not remove drive");
    }
  };

  const upcomingDrives = useMemo(() => {
    const now = new Date();
    return drives
      .map((d) => ({
        ...d,
        _when:
          d?.date?.seconds
            ? new Date(d.date.seconds * 1000)
            : d?.timestamp?.seconds
            ? new Date(d.timestamp.seconds * 1000)
            : null,
      }))
      .sort((a, b) => (a._when || 0) - (b._when || 0));
  }, [drives]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-red-600">
            {name || bank?.name || "Blood Bank"}
          </h1>
          <p className="text-sm text-gray-500">
            Manage your public page, inventory and drives
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded border text-sm"
            onClick={() => navigate(`/bloodbank/${id}`)}
          >
            View public page
          </button>
          <button
            className="px-3 py-2 rounded border text-sm"
            onClick={() => navigate("/home")}
          >
            Home
          </button>
        </div>
      </div>

      {/* DETAILS + LOGO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact</label>
              <input className="input w-full" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input className="input w-full" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <input className="input w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input className="input w-full" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description / Notes</label>
              <textarea
                className="input w-full"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button onClick={saveDetails} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
              Save details
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-sm font-semibold mb-2">Logo</div>
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-40 h-40 object-cover rounded border" />
          ) : (
            <div className="w-40 h-40 rounded border flex items-center justify-center text-xs text-gray-500">
              No logo
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="mt-2 block text-sm"
            onChange={onLogoChange}
          />
        </div>
      </div>

      {/* SUPPORTED GROUPS */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="text-sm font-semibold mb-2">Supported Blood Groups</div>
        <div className="grid grid-cols-4 gap-2">
          {GROUPS.map((g) => (
            <label key={g} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={bloodGroups.includes(g)}
                onChange={() => toggleGroup(g)}
              />
              <span>{g}</span>
            </label>
          ))}
        </div>
        <button
          onClick={saveDetails}
          className="mt-3 px-3 py-2 rounded border text-sm hover:bg-gray-50"
        >
          Save groups
        </button>
      </div>

      {/* STOCK EDITOR */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="text-sm font-semibold mb-3">Inventory / Units</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3">
          {GROUPS.map((g) => {
            const v = Number(stock[g] || 0);
            return (
              <div key={g} className="border rounded-lg p-3 flex flex-col items-center gap-2">
                <div className="font-semibold">{g}</div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 border rounded" onClick={() => dec(g)}>
                    −
                  </button>
                  <input
                    className="w-16 text-center border rounded py-1"
                    type="number"
                    min={0}
                    value={Number.isFinite(v) ? v : 0}
                    onChange={(e) => setStockUnits(g, Math.max(0, parseInt(e.target.value || "0", 10)))}
                  />
                  <button className="px-2 py-1 border rounded" onClick={() => inc(g)}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={saveStock}
          className="mt-3 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Save inventory
        </button>
      </div>

      {/* DRIVES */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Donation Drives</div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            className="input"
            placeholder="City (optional)"
            value={driveCity}
            onChange={(e) => setDriveCity(e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={driveDate}
            onChange={(e) => setDriveDate(e.target.value)}
          />
          <input
            type="time"
            className="input"
            value={driveTime}
            onChange={(e) => setDriveTime(e.target.value)}
          />
          <button onClick={addDrive} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">
            Add drive
          </button>
        </div>

        <div className="mt-4 divide-y border rounded">
          {upcomingDrives.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No drives scheduled.</div>
          ) : (
            upcomingDrives.map((d) => (
              <div key={d.id} className="p-3 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-semibold">
                    {(d.bankName || "Drive")} — {d.city || city || "N/A"}
                  </div>
                  <div className="text-gray-600">
                    {d._when ? d._when.toLocaleString() : "TBA"}
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  onClick={() => cancelDrive(d.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
