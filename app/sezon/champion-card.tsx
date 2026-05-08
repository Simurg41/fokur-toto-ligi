"use client";

import { useState } from "react";

type LeaderRow = {
  userId: string;
  name: string;
  points: number;
};

const confettiPieces = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 37) % 84)}%`,
  delay: `${(index % 8) * 80}ms`,
  color: ["bg-teal-200", "bg-white", "bg-amber-200", "bg-sky-200"][index % 4],
}));

export function ChampionCard({
  rows,
  isSeasonFinished,
}: {
  rows: LeaderRow[];
  isSeasonFinished: boolean;
}) {
  const [celebrationKey, setCelebrationKey] = useState(0);

  if (rows.length === 0) {
    return <EmptyState text="Sezon puanları henüz oluşmadı." />;
  }

  const topPoints = rows[0].points;
  const leaders = rows.filter((row) => row.points === topPoints);
  const title = isSeasonFinished
    ? leaders.length === 1
      ? "Sezon Şampiyonu"
      : "Sezon Şampiyonları"
    : leaders.length === 1
      ? "Sezon Lideri"
      : "Sezon Liderleri";

  return (
    <section className="relative overflow-hidden rounded-lg border border-teal-200 bg-teal-700 p-5 text-white shadow-sm">
      {isSeasonFinished ? (
        <div key={celebrationKey} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className={`absolute top-0 h-2 w-1.5 animate-[confetti-fall_1.2s_ease-out_forwards] rounded-sm opacity-0 ${piece.color}`}
              style={{ left: piece.left, animationDelay: piece.delay }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative">
        <p className="text-sm font-semibold text-teal-100">{title}</p>
        {isSeasonFinished ? <p className="mt-1 text-sm font-bold text-white">Tebrikler!</p> : null}
        <div className="mt-3 space-y-2">
          {leaders.map((leader) => (
            <div key={leader.userId} className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xl font-bold">{leader.name}</p>
              <p className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-teal-800">
                {leader.points} puan
              </p>
            </div>
          ))}
        </div>

        {isSeasonFinished ? (
          <button
            type="button"
            onClick={() => setCelebrationKey((current) => current + 1)}
            className="mt-4 h-10 w-full rounded-md bg-white px-4 text-sm font-bold text-teal-800 shadow-sm"
          >
            Kutlamayı Tekrar Oynat
          </button>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translateY(-16px) rotate(0deg);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(180px) rotate(260deg);
          }
        }
      `}</style>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">{text}</p>
    </section>
  );
}
