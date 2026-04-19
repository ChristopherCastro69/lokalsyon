import WaitlistForm from "@/components/WaitlistForm";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 px-8 py-24 sm:px-16">
        <header className="flex flex-col gap-6">
          <div className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase">
            Lokalsyon
          </div>
          <h1 className="max-w-2xl text-4xl sm:text-5xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
            Local delivery, found.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            A simple way for small sellers in rural municipalities to pinpoint where
            their customers actually live — without asking them to install anything.
            Share a link, they drop a pin, you deliver.
          </p>
        </header>

        <section className="flex flex-col gap-6 border-t border-zinc-200 pt-10 dark:border-zinc-800">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
              Request access
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Lokalsyon is invite-only while we get it stable. Tell us a bit about
              your shop and we&rsquo;ll reach out.
            </p>
          </div>
          <WaitlistForm />
        </section>
      </main>
    </div>
  );
}
