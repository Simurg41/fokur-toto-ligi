export default function ResultsPage() {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-teal-700">Sonuçlar</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Maç sonuçları</h1>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm leading-6 text-slate-600">
          Sonuçlar ekranı hazır. Harici API bağlantısı eklendiğinde haftanın maç sonuçları burada
          listelenecek.
        </p>
      </section>
    </div>
  );
}
