"use client";

import { useMemo, useState } from "react";
import { MOCK_MATCHES } from "@/lib/mock-matches";

type Choice = "1" | "X" | "2";

export default function PredictionsPage() {
  const [choices, setChoices] = useState<Record<number, Choice>>({});

  const selectedCount = useMemo(() => Object.keys(choices).length, [choices]);

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-teal-700">Tahminler</p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-950">15 maçlık kupon</h1>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-800">
            {selectedCount}/15
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Her maç için yalnızca bir seçim yap: 1, X veya 2.
        </p>
      </header>

      <div className="space-y-3">
        {MOCK_MATCHES.map((match) => (
          <article
            key={match.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
                  Maç {match.id}
                </p>
                <h2 className="mt-1 text-base font-bold text-slate-950">
                  {match.home} - {match.away}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{match.league}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label={`${match.home} - ${match.away}`}>
              {(["1", "X", "2"] as const).map((choice) => {
                const isSelected = choices[match.id] === choice;

                return (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setChoices((current) => ({
                        ...current,
                        [match.id]: choice,
                      }))
                    }
                    className={`h-11 rounded-md border text-sm font-bold transition ${
                      isSelected
                        ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300"
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
