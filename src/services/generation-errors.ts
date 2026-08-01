export type GenerationErrorCode =
  | "EMPTY_CONTENT"
  | "MARKDOWN_PARSE"
  | "IMAGE_LOAD"
  | "PAGE_LIMIT"
  | "OUTPUT_PATH"
  | "CANVAS_EXPORT"
  | "SAVE_FAILED"
  | "UNKNOWN";

export class CardGenerationError extends Error {
  readonly cause?: unknown;

  constructor(
    readonly code: GenerationErrorCode,
    message: string,
    readonly hint: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = "CardGenerationError";
    this.cause = options?.cause;
  }
}

export function toGenerationError(error: unknown): CardGenerationError {
  if (error instanceof CardGenerationError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/maximum|最大页数|超过最大页数/i.test(message)) {
    return new CardGenerationError(
      "PAGE_LIMIT",
      message,
      "请缩短内容、调小字号，或在设置中提高最大页数。",
      { cause: error }
    );
  }
  if (/folder|目录|路径|path/i.test(message)) {
    return new CardGenerationError(
      "OUTPUT_PATH",
      message,
      "请检查输出目录名称，并确认 Vault 可写。",
      { cause: error }
    );
  }
  if (/canvas|blob|图片加载|image/i.test(message)) {
    return new CardGenerationError(
      "CANVAS_EXPORT",
      message,
      "请检查图片格式和网络图片地址后重试。",
      { cause: error }
    );
  }

  return new CardGenerationError(
    "UNKNOWN",
    message || "未知错误",
    "请打开开发者控制台查看详细日志，并附上出错笔记内容提交 issue。",
    { cause: error }
  );
}

export function formatGenerationError(error: unknown): string {
  const normalized = toGenerationError(error);
  return `生成失败 [${normalized.code}]：${normalized.message}\n${normalized.hint}`;
}
