// src/components/PreFooterShowcase.js
import React from "react";
import { Trophy, Target, HeartPulse, Users, CheckCircle2 } from "lucide-react";

// ✅ Import images from src so the bundler outputs correct URLs
import story1 from "../story1.jpg";
import story2 from "../story2.jpg";
import story3 from "../story3.jpg";
import story4 from "../story4.jpg";

export default function PreFooterShowcase() {
  const stories = [
    { src: story1, title: "A life saved in time" },
    { src: story2, title: "Community blood drive" },
    { src: story3, title: "First-time donor" },
    { src: story4, title: "Emergency response" },
    // If you later add a 5th image:
    // { src: story5, title: "Hospital partnership" },
  ];

  const goals = [
    { label: "Increase donor registrations", pct: 85 },
    { label: "Reduce emergency wait times", pct: 72 },
    { label: "Expand verified bank network", pct: 90 },
  ];

  const achievements = [
    { icon: <Users className="w-5 h-5" />,      k: "18", sub: "Active Donors" },
    { icon: <HeartPulse className="w-5 h-5" />, k: "9",  sub: "Units Delivered" },
    { icon: <Trophy className="w-5 h-5" />,     k: "9",  sub: "Successful Drives" },
    { icon: <Target className="w-5 h-5" />,     k: "1",  sub: "Years of Impact" },
  ];

  return (
    <section className="mt-12">
      {/* STORIES */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Our Stories
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold">
            Real People. Real Impact.
          </h2>
          <p className="mt-1 text-gray-600">
            A quick glimpse into the moments your donations make possible.
          </p>
        </div>

        {/* Centered, tidy card grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
          {stories.map((s, i) => (
            <figure
              key={i}
              className="w-full max-w-[280px] relative overflow-hidden rounded-xl border border-gray-200 shadow-sm group"
            >
              <img
                src={s.src}
                alt={s.title}
                loading="lazy"
                className="h-40 md:h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs md:text-sm p-2">
                {s.title}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* GOAL + PROGRESS */}
      <div className="max-w-6xl mx-auto px-4 mt-10 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-semibold">
            <Target className="w-4 h-4" />
            Our Goal
          </div>
          <h3 className="mt-3 text-xl font-bold">Empowering a safer, faster blood network</h3>
          <p className="mt-2 text-gray-600">
            We’re building a community where no emergency waits for blood. From
            verified banks to instant alerts and donor-friendly scheduling, our
            platform focuses on speed, safety and transparency.
          </p>

          <ul className="mt-4 space-y-4">
            {goals.map((g) => (
              <li key={g.label}>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{g.label}</span>
                  <span className="text-gray-500">{g.pct}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-500"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ACHIEVEMENTS */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-semibold">
            <Trophy className="w-4 h-4" />
            Our Achievements
          </div>
          <h3 className="mt-3 text-xl font-bold">Proof in the numbers</h3>
          <p className="mt-2 text-white/80">
            Thanks to our donors, partners and volunteers, we keep growing and
            delivering when it matters the most.
          </p>

          {/* 2 cols on small screens -> 4 cols on large */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {achievements.map((a) => (
              <div
                key={a.sub}
                className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                  {a.icon}
                </div>
                <div>
                  <div className="text-2xl font-extrabold">{a.k}</div>
                  <div className="text-sm text-white/80">{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
