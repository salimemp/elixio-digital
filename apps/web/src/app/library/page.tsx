export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold ink-default">Your Library</h1>
          <span className="rounded-full border-2 border-gum-black bg-gum-mint px-4 py-1 text-sm font-bold uppercase">
            Buyer Only
          </span>
        </div>
        <p className="ink-default">Purchased assets and downloads appear here.</p>
      </section>
    </main>
  );
}
