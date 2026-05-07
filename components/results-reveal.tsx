"use client";

import { useEffect, useMemo, useState } from "react";

export type RevealScore = {
  userId: string;
  name: string;
  correctCount: number;
  points: number;
};

const revealDelay = 2500;

export function ResultsReveal({ scores }: { scores: RevealScore[] }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const visibleScores = scores.slice(0, visibleCount);
  const isFinished = scores.length > 0 && visibleCount === scores.length;
  const winners = useMemo(() => {
    if (!isFinished) {
      return [];
    }

    const highestScore = Math.max(...scores.map((score) => score.points));
    return scores.filter((score) => score.points === highestScore);
  }, [isFinished, scores]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleCount((current) => {
        const nextCount = current + 1;

        if (nextCount >= scores.length) {
          setIsRunning(false);
        }

        return nextCount;
      });
    }, visibleCount === 0 ? 250 : revealDelay);

    return () => window.clearTimeout(timeoutId);
  }, [isRunning, scores.length, visibleCount]);

  function startReveal() {
    setVisibleCount(0);
    setIsRunning(true);
  }

  function resetReveal() {
    setVisibleCount(0);
    setIsRunning(false);
  }

  return (
    <section className="space-y-4 rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-teal-700">Skor açıklaması</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Tüm Sonuçları Gör</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Haftanın skorlarını sırayla açıklıyoruz.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={startReveal}
          disabled={isRunning}
          className="h-11 flex-1 rounded-md bg-teal-700 px-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          Açıklamayı Başlat
        </button>
        {visibleCount > 0 ? (
          <button
            type="button"
            onClick={resetReveal}
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700"
          >
            Tekrar izle
          </button>
        ) : null}
      </div>

      {visibleScores.length > 0 ? (
        <div className="space-y-2">
          {visibleScores.map((score) => (
            <article
              key={score.userId}
              className="translate-y-0 rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-100 shadow-sm transition duration-500"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-950">{score.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {score.correctCount} doğru
                  </p>
                </div>
                <div className="shrink-0 rounded-md bg-white px-3 py-2 text-right">
                  <p className="text-xs font-semibold text-slate-500">Puan</p>
                  <p className="text-lg font-bold text-teal-700">{score.points}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {isFinished ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-700">Haftanın Kazananı</p>
          <div className="mt-2 space-y-1">
            {winners.map((winner) => (
              <p key={winner.userId} className="text-lg font-bold text-slate-950">
                {winner.name} - {winner.points} puan
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
