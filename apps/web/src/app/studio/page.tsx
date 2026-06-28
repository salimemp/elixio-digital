import { StudioClient } from "@/components/creator/StudioClient";

/**
 * /studio — creator AI workspace. Three tools in one page:
 * listing copywriter, asset critique, sales coach.
 */
export default function StudioPage() {
  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-extrabold ink-default">Studio</h1>
            <p className="mt-1 ink-default">
              AI tools that write, critique, and advise. Powered by Gemini.
            </p>
          </div>
          <span className="rounded-full border-2 border-gum-black bg-gum-pink px-4 py-1 text-sm font-bold uppercase">
            Creator Only
          </span>
        </div>

        <StudioClient />
      </section>
    </main>
  );
}