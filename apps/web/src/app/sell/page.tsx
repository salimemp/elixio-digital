export default function SellPage() {
  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-block rounded-full border-2 border-gum-black bg-gum-yellow px-4 py-1 text-sm font-bold uppercase">
            Creator Flow
          </span>
          <h1 className="text-4xl font-extrabold text-gum-black">List a new asset</h1>
        </div>

        <form className="gum-card space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-gum-black">Title</span>
            <input
              type="text"
              placeholder="e.g. Aurora UI Kit"
              className="mt-1 w-full rounded-xl border-2 border-gum-black bg-gum-cream px-4 py-3 outline-none focus:ring-2 focus:ring-gum-pink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-gum-black">Price (USD)</span>
            <input
              type="number"
              placeholder="49.00"
              className="mt-1 w-full rounded-xl border-2 border-gum-black bg-gum-cream px-4 py-3 outline-none focus:ring-2 focus:ring-gum-pink"
            />
          </label>
          <button
            type="submit"
            className="gum-btn-primary w-full"
          >
            Save draft
          </button>
        </form>
      </section>
    </main>
  );
}
