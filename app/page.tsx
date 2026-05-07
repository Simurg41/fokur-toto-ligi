import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-teal-700 p-5 text-white shadow-sm">
        <p className="text-sm font-semibold text-teal-100">Haftanın kuponu</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal">Fokur Toto Ligi</h1>
        <p className="mt-3 text-sm leading-6 text-teal-50">
          15 maçlık kuponunu seç, sonuçları takip et ve puan tablosunda durumunu gör.
        </p>
        <Link
          href="/tahminler"
          className="mt-5 inline-flex rounded-md bg-white px-4 py-3 text-sm font-bold text-teal-800 shadow-sm"
        >
          Tahmin yap
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">15</p>
          <p className="mt-1 text-sm text-slate-600">Mac</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-950">0</p>
          <p className="mt-1 text-sm text-slate-600">Canli veri</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Baslangic surumu</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Bu ekranda henüz harici API veya Supabase bağlantısı yok. Tahminler şimdilik cihazdaki
          React state ile çalışır.
        </p>
      </section>
    </div>
  );
}
