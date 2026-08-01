import { TFile, type App } from "obsidian";
import type { XhsTextCardSettings } from "../settings";
import { obsidianHttpClient } from "./http-client";
import type {
  DraftImageAsset,
  DraftPublishInput,
  DraftPublishResult,
  PublishingProgressCallback
} from "./types";
import { WechatApiClient } from "./wechat-api";
import { saveWebhookDraft } from "./webhook-publisher";

export interface PublishDraftOptions {
  platform: "wechat" | "webhook";
  title: string;
  author: string;
  digest: string;
  sourceUrl: string;
  openComments: boolean;
}

export class PublishingService {
  private wechatToken?: {
    appId: string;
    value: string;
    expiresAt: number;
  };

  constructor(private readonly app: App) {}

  async saveDraft(
    cardPaths: string[],
    sourceFile: TFile,
    options: PublishDraftOptions,
    settings: XhsTextCardSettings,
    onProgress?: PublishingProgressCallback
  ): Promise<DraftPublishResult> {
    onProgress?.({
      phase: "prepare",
      current: 0,
      total: cardPaths.length,
      message: "正在读取生成的卡片图片…"
    });
    const cards = await this.readCards(cardPaths);
    const input: DraftPublishInput = {
      ...options,
      sourcePath: sourceFile.path,
      cards
    };

    if (options.platform === "wechat") {
      validateWechatDraft(input);
      return this.saveWechatDraft(input, settings, onProgress);
    }

    const token = getSecret(
      this.app,
      settings.webhookTokenSecretName
    );
    const endpoint = settings.webhookEndpoint.trim();
    if (!endpoint) {
      throw new Error("请先在插件设置中填写 Webhook 地址");
    }
    validateWebhookEndpoint(endpoint);
    onProgress?.({
      phase: "draft",
      current: 0,
      total: 1,
      message: `正在发送 ${cards.length} 张卡片到多平台 Webhook…`
    });
    return saveWebhookDraft(
      obsidianHttpClient,
      endpoint,
      token,
      settings.webhookPlatformName.trim(),
      input
    );
  }

  private async readCards(
    cardPaths: string[]
  ): Promise<DraftImageAsset[]> {
    if (cardPaths.length === 0) {
      throw new Error("没有可保存到草稿的卡片图片");
    }
    const cards: DraftImageAsset[] = [];
    for (const path of cardPaths) {
      const file = this.app.vault.getFileByPath(path);
      if (!(file instanceof TFile)) {
        throw new Error(`找不到生成图片：${path}`);
      }
      if (!/\.(?:png|jpe?g)$/i.test(file.name)) {
        throw new Error(`平台草稿只支持 PNG/JPEG：${file.name}`);
      }
      cards.push({
        filename: file.name,
        mimeType: mimeTypeForName(file.name),
        bytes: await this.app.vault.readBinary(file)
      });
    }
    return cards;
  }

  private async saveWechatDraft(
    input: DraftPublishInput,
    settings: XhsTextCardSettings,
    onProgress?: PublishingProgressCallback
  ): Promise<DraftPublishResult> {
    const appId = settings.wechatAppId.trim();
    const appSecret = getSecret(
      this.app,
      settings.wechatAppSecretName
    );
    if (!appId || !appSecret) {
      throw new Error("请先配置微信公众号 AppID 和 AppSecret");
    }

    const api = new WechatApiClient(obsidianHttpClient);
    onProgress?.({
      phase: "token",
      current: 0,
      total: 1,
      message: "正在获取微信公众号访问凭证…"
    });
    const accessToken = await this.getWechatToken(
      api,
      appId,
      appSecret
    );

    const imageMediaIds: string[] = [];
    for (const [index, card] of input.cards.entries()) {
      onProgress?.({
        phase: "image",
        current: index + 1,
        total: input.cards.length,
        message: `正在上传永久贴图素材 ${index + 1}/${input.cards.length}…`
      });
      imageMediaIds.push(
        await api.uploadPermanentImage(
          accessToken,
          card.bytes,
          card.filename,
          card.mimeType
        )
      );
    }

    onProgress?.({
      phase: "draft",
      current: 0,
      total: 1,
      message: "正在保存到微信公众号贴图草稿…"
    });
    const draftId = await api.addImageDraft(accessToken, {
      title: input.title,
      content: input.digest,
      imageMediaIds,
      openComments: input.openComments
    });
    return {
      platform: "wechat",
      draftId,
      message: `已将 ${input.cards.length} 张卡片保存为微信公众号贴图草稿`
    };
  }

  private async getWechatToken(
    api: WechatApiClient,
    appId: string,
    appSecret: string
  ): Promise<string> {
    if (
      this.wechatToken?.appId === appId &&
      this.wechatToken.expiresAt > Date.now() + 60_000
    ) {
      return this.wechatToken.value;
    }
    const token = await api.getStableAccessToken(appId, appSecret);
    this.wechatToken = {
      appId,
      value: token.accessToken,
      expiresAt: Date.now() + token.expiresIn * 1000
    };
    return token.accessToken;
  }
}

function getSecret(app: App, name: string): string {
  if (!name) return "";
  return app.secretStorage.getSecret(name) ?? "";
}

function mimeTypeForName(name: string): string {
  return /\.png$/i.test(name) ? "image/png" : "image/jpeg";
}

function validateWebhookEndpoint(endpoint: string): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Webhook 地址格式无效");
  }
  const localHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Webhook 必须使用 HTTPS；本机 localhost 调试除外");
  }
}

function validateWechatDraft(input: DraftPublishInput): void {
  if (!input.title.trim()) {
    throw new Error("请填写微信公众号草稿标题");
  }
  if (Array.from(input.title.trim()).length > 64) {
    throw new Error("微信公众号标题不能超过 64 个字符");
  }
  if (input.cards.length > 20) {
    throw new Error(
      `微信公众号贴图最多支持 20 张，当前生成了 ${input.cards.length} 张`
    );
  }
  const contentBytes = new TextEncoder().encode(input.digest).byteLength;
  if (Array.from(input.digest).length >= 20_000 || contentBytes >= 1_000_000) {
    throw new Error("微信公众号贴图配文必须少于 2 万字符且小于 1 MB");
  }
}
