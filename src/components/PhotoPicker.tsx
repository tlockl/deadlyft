"use client";

import { useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { TARGET_SIZE } from "@/lib/photo-constants";

/**
 * Square-crops from the centre and scales down to `size`, re-encoding as JPEG.
 *
 * Doing this in the browser means a phone uploads ~50KB instead of a multi-
 * megabyte camera file, normalises every format the picker can hand us (an
 * iPhone's HEIC included, since the browser decodes it), and spares the server
 * an image-processing dependency.
 */
async function toSquareJpeg(file: File, size: number): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const target = Math.min(size, side);

    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");

    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      target,
      target,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("encode failed");

    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export default function PhotoPicker({
  name,
  currentSrc,
}: {
  name: string;
  currentSrc: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const resized = await toSquareJpeg(file, TARGET_SIZE);

      // Swap the shrunken file into the input so the form posts that instead.
      const transfer = new DataTransfer();
      transfer.items.add(resized);
      if (inputRef.current) inputRef.current.files = transfer.files;

      setPreview(URL.createObjectURL(resized));
    } catch {
      // Couldn't decode or re-encode it here — let the original go up and be
      // judged by the server, which validates properly anyway.
      setPreview(URL.createObjectURL(file));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Avatar name={name} src={preview ?? currentSrc} size={96} />

      <input
        ref={inputRef}
        id="photo"
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleChange}
        className="sr-only"
      />
      {/* A real <label for>, so the picker opens without JavaScript too. */}
      <label htmlFor="photo" className="text-[17px] font-medium text-accent">
        {busy ? "Preparing…" : preview ? "Choose a different photo" : "Choose Photo"}
      </label>
    </div>
  );
}
