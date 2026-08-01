import type { HttpClient } from "./types";

const WECHAT_API = "https://api.weixin.qq.com";

export interface WechatImageDraft {
  title: string;
  content: string;
  imageMediaIds: string[];
  openComments: boolean;
}

export class WechatApiClient {
  constructor(private readonly http: HttpClient) {}

  async getStableAccessToken(
    appId: string,
    appSecret: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await sendWechatRequest(this.http, {
      url: `${WECHAT_API}/cgi-bin/stable_token`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credential",
        appid: appId,
        secret: appSecret,
        force_refresh: false
      })
    }, "获取微信 access_token");
    const data = readWechatJson(response.json, "获取微信 access_token");
    const accessToken = readString(data.access_token);
    if (!accessToken) {
      throw new Error("微信未返回 access_token");
    }
    return {
      accessToken,
      expiresIn: readNumber(data.expires_in, 7200)
    };
  }

  async uploadPermanentImage(
    accessToken: string,
    bytes: ArrayBuffer,
    filename: string,
    mimeType: string
  ): Promise<string> {
    const boundary = createBoundary();
    const body = createMultipartBody(
      boundary,
      "media",
      filename,
      mimeType,
      bytes
    );
    const response = await sendWechatRequest(this.http, {
      url: `${WECHAT_API}/cgi-bin/material/add_material?access_token=${encodeURIComponent(
        accessToken
      )}&type=image`,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body
    }, "上传微信贴图素材");
    const data = readWechatJson(response.json, "上传微信贴图素材");
    const mediaId = readString(data.media_id);
    if (!mediaId) throw new Error("微信未返回图片素材 media_id");
    return mediaId;
  }

  async addImageDraft(
    accessToken: string,
    draft: WechatImageDraft
  ): Promise<string> {
    const response = await sendWechatRequest(this.http, {
      url: `${WECHAT_API}/cgi-bin/draft/add?access_token=${encodeURIComponent(
        accessToken
      )}`,
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        articles: [
          {
            article_type: "newspic",
            title: draft.title,
            content: draft.content,
            need_open_comment: draft.openComments ? 1 : 0,
            only_fans_can_comment: 0,
            image_info: {
              image_list: draft.imageMediaIds.map(
                (imageMediaId) => ({
                  image_media_id: imageMediaId
                })
              )
            }
          }
        ]
      })
    }, "保存微信公众号贴图草稿");
    const data = readWechatJson(
      response.json,
      "保存微信公众号贴图草稿"
    );
    const mediaId = readString(data.media_id);
    if (!mediaId) throw new Error("微信未返回草稿 media_id");
    return mediaId;
  }
}

async function sendWechatRequest(
  http: HttpClient,
  request: Parameters<HttpClient>[0],
  operation: string
): ReturnType<HttpClient> {
  try {
    return await http(request);
  } catch {
    // Never expose request URLs here: WeChat API URLs can contain access_token.
    throw new Error(`${operation}失败：网络请求失败`);
  }
}

export function createMultipartBody(
  boundary: string,
  fieldName: string,
  filename: string,
  mimeType: string,
  bytes: ArrayBuffer
): ArrayBuffer {
  const encoder = new TextEncoder();
  const safeFilename = filename.replace(/["\r\n]/g, "_");
  const head = encoder.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${safeFilename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
  const output = new Uint8Array(
    head.byteLength + bytes.byteLength + tail.byteLength
  );
  output.set(head, 0);
  output.set(new Uint8Array(bytes), head.byteLength);
  output.set(tail, head.byteLength + bytes.byteLength);
  return output.buffer;
}

function createBoundary(): string {
  return `----TextToCard${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

function readWechatJson(
  value: unknown,
  operation: string
): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(`${operation}失败：响应不是 JSON 对象`);
  }
  const data = value as Record<string, unknown>;
  const errorCode = readNumber(data.errcode, 0);
  if (errorCode !== 0) {
    throw new Error(
      `${operation}失败 [微信 ${errorCode}]：${
        readString(data.errmsg) || "未知错误"
      }`
    );
  }
  return data;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}
