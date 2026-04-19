import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import Wordmark from "@/components/brand/Wordmark";
import Compass from "@/components/brand/Compass";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-hair/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3 sm:px-8">
          <Wordmark />
          <Link
            href="/admin/login"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3 hover:text-ink"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-24 pt-12 sm:px-8 sm:pt-20">
        {/* Hero */}
        <section className="relative flex flex-col gap-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-hair bg-surface px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                Invite-only · Visayas &amp; beyond
              </span>
              <h1 className="font-display text-[44px] leading-[0.95] tracking-tight text-ink sm:text-[68px]">
                Local delivery,
                <br />
                <em className="not-italic text-mangrove">found.</em>
              </h1>
            </div>
            <Compass className="mt-2 hidden shrink-0 text-ink-3 sm:block" size={64} />
          </div>

          <p className="max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
            A tiny, mobile-first tool for small sellers in rural municipalities
            to pinpoint where their customers really live — no app install, no
            fuss. Share a link, they drop a pin, you deliver.
          </p>

          <div className="flex items-center gap-4">
            <div className="divider-dashed w-12" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              Est. 2026 · Built on the road
            </span>
          </div>
        </section>

        {/* Three-step diagram */}
        <section className="mt-16 grid gap-5 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Generate a link",
              body: "Type your customer's name and product. We make a one-use delivery link.",
            },
            {
              n: "02",
              title: "They drop a pin",
              body: "No app install. They open the link, tap the map or use GPS, send.",
            },
            {
              n: "03",
              title: "You deliver",
              body: "Your admin shows a live map and optimizes a multi-stop route.",
            },
          ].map((step) => (
            <article
              key={step.n}
              className="with-crosshairs relative flex flex-col gap-2 border border-hair bg-surface p-5"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-terracotta">
                {step.n}
              </span>
              <h3 className="font-display text-xl text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-2">{step.body}</p>
            </article>
          ))}
        </section>

        {/* Waitlist */}
        <section
          id="access"
          className="mt-16 flex flex-col gap-7 border-t border-hair pt-12"
        >
          <header className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              §&nbsp;Request access
            </span>
            <h2 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
              Tell us about your shop.
            </h2>
            <p className="max-w-xl text-sm text-ink-2">
              Lokalsyon is in soft launch. Every new seller is approved by hand
              so we can keep quality tight. We&rsquo;ll write back within a day
              or two.
            </p>
            <p className="text-sm text-ink-2">
              Already an approved seller?{" "}
              <Link
                href="/admin/login"
                className="font-medium text-ink underline underline-offset-4 decoration-terracotta decoration-2 hover:decoration-ink"
              >
                Sign in here →
              </Link>
            </p>
          </header>

          <WaitlistForm />
        </section>
      </main>

      <footer className="border-t border-hair/60">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 sm:px-8">
          <span>© Lokalsyon</span>
          <span>11°16′N · 123°43′E</span>
        </div>
      </footer>
    </div>
  );
}
