import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const QUESTIONS = [
  { id: "age", label: "I am 18–65 years old (or local legal range).", required: true },
  { id: "weight", label: "I weigh at least 50kg.", required: true },
  { id: "health", label: "I feel healthy today (no fever/cold symptoms).", required: true },
  { id: "recentDonation", label: "I have NOT donated blood in the last 3 months.", required: true },
  { id: "meds", label: "I am not on disqualifying medications (per local rules).", required: false },
];

export default function EligibilityCheck() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return navigate("/login");
      const ref = doc(db, "Users", u.uid);
      const snap = await getDoc(ref);
      setCurrent({ uid: u.uid, ref });
      if (snap.exists()) {
        const el = snap.data().eligibility;
        if (el?.passed) {
          // Already passed; allow re-check if they want
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const toggle = (id) =>
    setAnswers((prev) => ({ ...prev, [id]: !prev[id] }));

  const allRequiredChecked = QUESTIONS.every(
    (q) => !q.required || answers[q.id]
  );

  const save = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const payload = {
        eligibility: {
          passed: !!allRequiredChecked,
          answers,
          lastCheckedAt: new Date().toISOString(),
        },
      };
      await updateDoc(current.ref, payload);
      alert(allRequiredChecked
        ? "Great! You're eligible to donate."
        : "You do not meet the minimum requirements at this time.");
      navigate("/schedule-donation");
    } catch (e) {
      console.error("eligibility save error:", e);
      alert("Could not save eligibility. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="max-w-lg mx-auto bg-white rounded shadow p-6">
      <h1 className="text-2xl font-bold mb-2">Donor Eligibility Check</h1>
      <p className="text-gray-600 mb-4 text-sm">
        Please confirm the following statements. This is not medical advice—always follow local guidelines.
      </p>

      <div className="space-y-3">
        {QUESTIONS.map((q) => (
          <label key={q.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!answers[q.id]}
              onChange={() => toggle(q.id)}
              className="mt-1"
            />
            <span>
              {q.label} {q.required && <span className="text-red-600">*</span>}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="btn-primary mt-5"
      >
        {saving ? "Saving..." : "Save & Continue"}
      </button>

      <p className="text-xs text-gray-500 mt-3">
        Note: If you are unsure about any question, consult a healthcare professional.
      </p>
    </div>
  );
}
