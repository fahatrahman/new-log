// src/components/Analysis.js
import React from "react";
import HomeInsights from "./HomeInsights";

export default function Analysis() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-5xl mx-auto w-full px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-red-600">Analysis</h1>
        <p className="text-sm text-gray-600">
          Community stats, requests & donations trends, and popular blood groups.
        </p>
      </header>

      <main className="px-4 mt-4 mb-12">
        <HomeInsights />
      </main>
    </div>
  );
}
