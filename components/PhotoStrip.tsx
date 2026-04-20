"use client";

import { useEffect, useState } from "react";

type Props = {
  photos: string[];
  size?: number;
};

export default function PhotoStrip({ photos, size = 36 }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight")
        setOpenIndex((i) => (i == null ? i : Math.min(photos.length - 1, i + 1)));
      if (e.key === "ArrowLeft")
        setOpenIndex((i) => (i == null ? i : Math.max(0, i - 1)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, photos.length]);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {photos.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative shrink-0 overflow-hidden rounded border border-hair transition hover:border-hair-strong"
            style={{ width: size, height: size }}
            aria-label={`Open photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Landmark photo ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndex={setOpenIndex}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 font-mono text-sm text-ink hover:bg-paper"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt={`Landmark photo ${index + 1}`}
        className="max-h-[85vh] max-w-[90vw] rounded object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 ? (
        <>
          {index > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIndex(index - 1);
              }}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 font-mono text-lg text-ink hover:bg-paper"
            >
              ←
            </button>
          ) : null}
          {index < photos.length - 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIndex(index + 1);
              }}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 font-mono text-lg text-ink hover:bg-paper"
            >
              →
            </button>
          ) : null}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-pill bg-paper/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
            {index + 1} / {photos.length}
          </span>
        </>
      ) : null}
    </div>
  );
}
