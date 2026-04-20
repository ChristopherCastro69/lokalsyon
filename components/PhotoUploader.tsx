"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/image-compress";

type Props = {
  slug: string;
  code: string;
  initialPhotos: string[];
  onChange?: (photos: string[]) => void;
};

const MAX_PHOTOS = 2;

type UploadStatus = "uploading" | "done" | "error";
type Slot = {
  id: string;
  url: string; // blob: URL while uploading, public URL after
  status: UploadStatus;
  error?: string;
};

export default function PhotoUploader({
  slug,
  code,
  initialPhotos,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [slots, setSlots] = useState<Slot[]>(
    initialPhotos.map((url) => ({
      id: url,
      url,
      status: "done" as UploadStatus,
    })),
  );

  const count = slots.length;
  const atMax = count >= MAX_PHOTOS;

  function emit(next: Slot[]) {
    setSlots(next);
    onChange?.(next.filter((s) => s.status === "done").map((s) => s.url));
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (atMax) return;

    const tempId = crypto.randomUUID();
    const tempUrl = URL.createObjectURL(file);
    const pending: Slot = { id: tempId, url: tempUrl, status: "uploading" };
    const withPending = [...slots, pending];
    setSlots(withPending);

    try {
      const { blob } = await compressImage(file);
      const form = new FormData();
      form.append("file", blob, "photo.jpg");

      const res = await fetch(`/api/s/${slug}/p/${code}/photos`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as
        | { ok: true; url: string; photos: string[] }
        | { ok: false; message: string };

      URL.revokeObjectURL(tempUrl);

      if (!res.ok || !json.ok) {
        const message = !json.ok ? json.message : "Upload failed.";
        emit(
          withPending.map((s) =>
            s.id === tempId ? { ...s, status: "error", error: message } : s,
          ),
        );
        return;
      }

      emit(
        withPending.map((s) =>
          s.id === tempId
            ? { id: json.url, url: json.url, status: "done" as UploadStatus }
            : s,
        ),
      );
    } catch (err) {
      URL.revokeObjectURL(tempUrl);
      const message = err instanceof Error ? err.message : "Couldn't process photo.";
      emit(
        withPending.map((s) =>
          s.id === tempId ? { ...s, status: "error", error: message } : s,
        ),
      );
    }
  }

  async function remove(slot: Slot) {
    if (slot.status === "uploading") return; // can't cancel mid-flight for MVP
    if (slot.status === "error") {
      emit(slots.filter((s) => s.id !== slot.id));
      return;
    }
    // Optimistic removal.
    const next = slots.filter((s) => s.id !== slot.id);
    emit(next);
    try {
      await fetch(`/api/s/${slug}/p/${code}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: slot.url }),
      });
    } catch {
      // Network blip — the optimistic state is good enough for the user; a
      // reload will reconcile with the server if needed.
    }
  }

  function retry(slot: Slot) {
    emit(slots.filter((s) => s.id !== slot.id));
    inputRef.current?.click();
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
          Photos <span className="ml-1 text-ink-3">opt.</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          {count}/{MAX_PHOTOS}
        </span>
      </div>

      <p className="text-xs text-ink-3">
        Optional. A photo of your gate, street corner, or nearest landmark
        helps us find the right drop-off.
      </p>

      <div className="flex flex-wrap items-stretch gap-2">
        {slots.map((slot) => (
          <Thumb key={slot.id} slot={slot} onRemove={remove} onRetry={retry} />
        ))}

        {!atMax ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-field border border-dashed border-hair-strong bg-paper text-ink-2 transition active:bg-paper-deep active:text-ink hover:bg-paper-deep hover:text-ink"
          >
            <CameraIcon />
            <span className="font-mono text-[9px] uppercase tracking-[0.15em]">
              Add photo
            </span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
    </section>
  );
}

function Thumb({
  slot,
  onRemove,
  onRetry,
}: {
  slot: Slot;
  onRemove: (s: Slot) => void;
  onRetry: (s: Slot) => void;
}) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-field border border-hair bg-paper-deep">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slot.url}
        alt="Landmark photo"
        className={`h-full w-full object-cover transition-opacity ${
          slot.status === "uploading" ? "opacity-60" : ""
        }`}
      />
      {slot.status === "uploading" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse bg-ink/10"
        />
      ) : null}
      {slot.status === "error" ? (
        <button
          type="button"
          onClick={() => onRetry(slot)}
          className="absolute inset-0 flex items-center justify-center bg-brick/80 font-mono text-[10px] uppercase tracking-[0.15em] text-paper"
          title={slot.error ?? "Upload failed"}
        >
          Retry
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onRemove(slot)}
          aria-label="Remove photo"
          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 font-mono text-[10px] text-paper transition hover:bg-ink"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 8a2 2 0 0 1 2-2h2.5l1.2-1.6A1 1 0 0 1 9.5 4h5a1 1 0 0 1 .8.4L16.5 6H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
