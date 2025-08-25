// src/components/DonorBadges.js
import React, { useMemo } from "react";

const BADGES = [
  { id: "first",     label: "First Donation", threshold: 1,  emoji: "🎉" },
  { id: "helper",    label: "Helping Hand",   threshold: 3,  emoji: "🤝" },
  { id: "lifesaver", label: "Life Saver",     threshold: 5,  emoji: "🩸" },
  { id: "silver",    label: "Silver Donor",   threshold: 10, emoji: "🥈" },
  { id: "gold",      label: "Gold Donor",     threshold: 20, emoji: "🥇" },
];

export default function DonorBadges({ count, lastApprovedAt }) {
  const { next, progressPct, nextEligibleDate, daysLeft } = useMemo(() => {
    const next = BADGES.find(b => b.threshold > count) || null;
    const progressPct = next ? Math.min(100, Math.floor((count / next.threshold) * 100)) : 100;

    // Next donation eligibility: 90 days after last approved donation date
    let nextEligibleDate = null;
    let daysLeft = 0;
    if (lastApprovedAt instanceof Date && !isNaN(lastApprovedAt.getTime())) {
      nextEligibleDate = new Date(lastApprovedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
      const msLeft = nextEligibleDate - new Date();
      daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    }

    return { next, progressPct, nextEligibleDate, daysLeft };
  }, [count, lastApprovedAt]);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-red-600">Your Donation Badges</h2>
        <div className="text-sm text-gray-600">
          Total approved donations: <span className="font-semibold">{count}</span>
        </div>
      </div>

      {/* Progress toward next badge */}
      <div className="mb-5">
        {next ? (
          <>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress to <b>{next.label}</b> (need {next.threshold})</span>
              <span>{Math.min(progressPct, 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
              <div className="bg-red-600 h-2" style={{ width: `${progressPct}%` }} />
            </div>
          </>
        ) : (
          <div className="text-sm">You’ve unlocked all badges — legend! 🏆</div>
        )}
      </div>

      {/* Earned & locked badges */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {BADGES.map((b) => {
          const has = count >= b.threshold;
          return (
            <div
              key={b.id}
              className={`rounded border p-3 text-center ${has ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200 opacity-75"}`}
              title={has ? "Unlocked" : `Unlock at ${b.threshold} donations`}
            >
              <div className="text-2xl">{b.emoji}</div>
              <div className="mt-1 text-sm font-semibold">{b.label}</div>
              <div className="text-xs text-gray-600">{has ? "Unlocked" : `Need ${b.threshold}`}</div>
            </div>
          );
        })}
      </div>

      {/* Next eligibility */}
      <div className="mt-5 text-sm text-gray-700">
        {nextEligibleDate ? (
          <span>
            Next eligible donation date:{" "}
            <b>{nextEligibleDate.toLocaleDateString()}</b>
            {daysLeft > 0 && <> · <b>{daysLeft}</b> day{daysLeft === 1 ? "" : "s"} left</>}
          </span>
        ) : (
          <span>Schedule your first donation to start earning badges!</span>
        )}
      </div>
    </div>
  );
}
