import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy,
  query, serverTimestamp, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const SEVERITIES = ["low","medium","high","emergency"];

export default function AlertManager({ bankId, bankName }) {
  const uid = getAuth().currentUser?.uid;
  const [form, setForm] = useState({ bloodGroup: "", city: "", severity: "high", message: "", active: true });
  const [alerts, setAlerts] = useState([]);
  const canManage = useMemo(() => uid === bankId, [uid, bankId]);

  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("bankId", "==", bankId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => setAlerts(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return () => unsub();
  }, [bankId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const { bloodGroup, city, severity, message, active } = form;
    if (!bloodGroup || !city.trim() || !message.trim()) return alert("Please fill all fields.");
    try {
      await addDoc(collection(db, "alerts"), {
        bankId, bankName: bankName || "",
        bloodGroup, city: city.trim(), severity, message: message.trim(),
        active: !!active, createdAt: serverTimestamp(),
      });
      setForm({ bloodGroup: "", city: "", severity: "high", message: "", active: true });
    } catch (e) {
      console.error("create alert error:", e);
      alert("Could not create alert. Try again.");
    }
  };

  const toggleActive = async (a) => {
    try { await updateDoc(doc(db, "alerts", a.id), { active: !a.active }); }
    catch (e) { console.error("toggle error:", e); }
  };

  const remove = async (a) => {
    if (!window.confirm("Delete this alert?")) return;
    try { await deleteDoc(doc(db, "alerts", a.id)); }
    catch (e) { console.error("delete error:", e); }
  };

  const badge = (sev) => (
    sev === "emergency" ? "bg-red-700 text-white" :
    sev === "high"      ? "bg-red-600 text-white" :
    sev === "medium"    ? "bg-yellow-500 text-black" :
                          "bg-gray-300 text-black"
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-3 text-red-600">Urgent Alerts</h3>

      {canManage ? (
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5">
          <select className="input" value={form.bloodGroup}
                  onChange={(e)=>setForm({...form, bloodGroup:e.target.value})} required>
            <option value="">Blood Group</option>
            {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <input className="input" placeholder="City" value={form.city}
                 onChange={(e)=>setForm({...form, city:e.target.value})} required />

          <select className="input" value={form.severity}
                  onChange={(e)=>setForm({...form, severity:e.target.value})}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input className="input" placeholder="Short message (e.g., O- urgently needed)"
                 value={form.message} onChange={(e)=>setForm({...form, message:e.target.value})} required />

          <button type="submit" className="btn-primary">Post</button>
        </form>
      ) : (
        <p className="text-sm text-gray-600 mb-3">Only the owning blood bank can post alerts.</p>
      )}

      {alerts.length === 0 ? (
        <p className="text-sm text-gray-600">No alerts yet.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="border rounded p-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge(a.severity)}`}>{a.severity?.toUpperCase()}</span>
                  <span className="font-bold">{a.bloodGroup}</span>
                  <span className="text-gray-600 text-sm">· {a.city}</span>
                  {!a.active && <span className="text-xs ml-2 px-2 py-0.5 rounded bg-gray-200">inactive</span>}
                </div>
                <p className="text-sm mt-1">{a.message}</p>
                {a.bankName && <p className="text-xs text-gray-500 mt-1">Posted by: {a.bankName}</p>}
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(a)} className="px-2 py-1 rounded border">
                    {a.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => remove(a)} className="px-2 py-1 rounded bg-red-600 text-white">
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
