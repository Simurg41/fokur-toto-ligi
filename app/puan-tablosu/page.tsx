const rows = [
  { rank: 1, name: "Demo Kullanici", points: 0 },
  { rank: 2, name: "Misafir", points: 0 },
  { rank: 3, name: "Yeni Oyuncu", points: 0 },
];

export default function LeaderboardPage() {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Puan Tablosu</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Haftalık sıralama</h1>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {rows.map((row) => (
          <div
            key={row.rank}
            className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                {row.rank}
              </span>
              <span className="text-sm font-semibold text-slate-900">{row.name}</span>
            </div>
            <span className="text-sm font-bold text-teal-700">{row.points} puan</span>
          </div>
        ))}
      </section>
    </div>
  );
}
