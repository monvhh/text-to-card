import type {
  DraftPublishInput,
  DraftPublishResult,
  HttpClient
} from "./types";

export async function saveWebhookDraft(
  http: HttpClient,
  endpoint: string,
  token: string,
  platformName: string,
  input: DraftPublishInput
): Promise<DraftPublishResult> {
  const response = await http({
    url: endpoint,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      version: 1,
      action: "save_image_draft",
      platform: platformName || "custom",
      platforms: platformName
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
      document: {
        sourcePath: input.sourcePath,
        title: input.title,
        author: input.author,
        digest: input.digest,
        sourceUrl: input.sourceUrl,
        cardCount: input.cards.length
      },
      cards: input.cards.map((card, index) => ({
        index: index + 1,
        filename: card.filename,
        mimeType: card.mimeType,
        base64: arrayBufferToBase64(card.bytes)
      }))
    })
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Webhook 返回 HTTP ${response.status}`);
  }
  const data =
    response.json && typeof response.json === "object"
      ? (response.json as Record<string, unknown>)
      : {};
  if (data.ok === false) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Webhook 保存草稿失败"
    );
  }
  return {
    platform: "webhook",
    draftId:
      typeof data.draftId === "string" ? data.draftId : "",
    url: typeof data.url === "string" ? data.url : undefined,
    message:
      typeof data.message === "string"
        ? data.message
        : "草稿已发送到 Webhook"
  };
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
