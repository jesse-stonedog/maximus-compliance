/**
 * Document download.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getStore } from "@/lib/server";
import { readStoredFile } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const document = getStore().documents.getDocument(id);
  if (!document) return new Response("Not found", { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readStoredFile(document.storageKey);
  } catch {
    // The row survived but the file did not — a restore that missed the
    // documents directory, most likely. Say which, rather than a bare 500.
    return new Response(
      "The record for this document exists but its file is missing from storage.",
      { status: 410 },
    );
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": document.contentType,
      /*
       * ALWAYS `attachment`, never `inline`.
       *
       * An uploaded file is untrusted content served from this origin. Rendered
       * inline, anything the browser will execute — and content sniffing means
       * that is not only the types we think we allow — runs with the user's
       * session. Downloading it costs one click and removes the whole class.
       */
      "content-disposition": `attachment; filename="${document.originalFilename.replace(/["\\\r\n]/g, "_")}"`,
      "content-length": String(bytes.byteLength),
      // Belt and braces against sniffing, and against being framed.
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
