import { requestUrl } from "obsidian";

const MAX_REMOTE_IMAGE_BYTES = 12 * 1024 * 1024;

/** Download remote Markdown images before canvas rendering. This avoids
 * canvas tainting and works consistently on Obsidian mobile. */
export async function inlineRemoteMarkdownImages(
  markdown: string
): Promise<string> {
  const pattern = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/gi;
  const matches = [...markdown.matchAll(pattern)];
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const alt = match[1] ?? "";
      const url = match[2] ?? "";
      try {
        const response = await requestUrl({
          url,
          method: "GET",
          throw: false
        });
        if (response.status < 200 || response.status >= 300) {
          return match[0];
        }
        if (response.arrayBuffer.byteLength > MAX_REMOTE_IMAGE_BYTES) {
          console.warn(`[Text to Card] Remote image is too large: ${url}`);
          return match[0];
        }
        const contentType = normalizeImageMimeType(
          response.headers["content-type"],
          url
        );
        const base64 = arrayBufferToBase64(response.arrayBuffer);
        return `![${alt}](data:${contentType};base64,${base64})`;
      } catch (error) {
        console.warn(`[Text to Card] Remote image download failed: ${url}`, error);
        return match[0];
      }
    })
  );

  let index = 0;
  return markdown.replace(pattern, () => replacements[index++] ?? "");
}

function normalizeImageMimeType(
  header: string | undefined,
  url: string
): string {
  const mime = header?.split(";", 1)[0]?.trim().toLowerCase();
  if (mime?.startsWith("image/")) {
    return mime;
  }
  if (/\.svg(?:\?|$)/i.test(url)) return "image/svg+xml";
  if (/\.webp(?:\?|$)/i.test(url)) return "image/webp";
  if (/\.gif(?:\?|$)/i.test(url)) return "image/gif";
  if (/\.png(?:\?|$)/i.test(url)) return "image/png";
  return "image/jpeg";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + chunkSize)
    );
  }
  return btoa(binary);
}
