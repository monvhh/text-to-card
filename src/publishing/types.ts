export type PublishingPlatform = "wechat" | "webhook";

export interface DraftPublishInput {
  platform: PublishingPlatform;
  sourcePath: string;
  title: string;
  author: string;
  digest: string;
  sourceUrl: string;
  openComments: boolean;
  cards: DraftImageAsset[];
}

export interface DraftImageAsset {
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

export interface DraftPublishResult {
  platform: PublishingPlatform;
  draftId: string;
  url?: string;
  message: string;
}

export interface PublishingProgress {
  phase: "prepare" | "token" | "image" | "draft";
  current: number;
  total: number;
  message: string;
}

export type PublishingProgressCallback = (
  progress: PublishingProgress
) => void;

export interface HttpRequest {
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string | ArrayBuffer;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  text: string;
  json: unknown;
  arrayBuffer: ArrayBuffer;
}

export type HttpClient = (
  request: HttpRequest
) => Promise<HttpResponse>;
