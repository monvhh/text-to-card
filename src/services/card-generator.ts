import {
  App,
  normalizePath,
  TFile,
  TFolder
} from "obsidian";
import type {
  ExportFormat,
  XhsTextCardSettings
} from "../settings";
import {
  getTemplate,
  type TemplateId
} from "../templates";
import { addFileNameTitle } from "../utils/article-title";
import { prepareMarkdown } from "../utils/markdown";
import { getPageDimensions } from "../utils/page-ratio";

export interface CardGenerationOptions {
  templateId: TemplateId;
  templateSelection: string;
  exportFormat: ExportFormat;
  pageRatio: XhsTextCardSettings["pageRatio"];
  outputFolder: string;
  includeCover: boolean;
  coverImagePath: string;
  coverTitle: string;
  signatureText: string;
  useFileNameAsTitle: boolean;
  stripFrontmatter: boolean;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textPadding: number;
  bgColor: string;
  textColor: string;
  accentColor: string;
  watermarkText: string;
  showPageNumber: boolean;
  insertLinksAfterGenerate: boolean;
  copyFirstImageAfterGenerate: boolean;
  revealOutputAfterGenerate: boolean;
  maxPages: number;
  fontFamily: string;
  logoPath: string;
  brandPresetId: string;
  updateExisting: boolean;
  outputNameSuffix: string;
}

export interface CardGenerationResult {
  files: string[];
  outputFolder: string;
}

export interface CardGenerationSession {
  pages: unknown[][];
  config: Record<string, unknown>;
  templateId: TemplateId;
  width: number;
  height: number;
}

const OUTPUT_WIDTH = 1242;

export class CardGenerator {
  constructor(private readonly app: App) {}

  async generate(
    markdown: string,
    sourceFile: TFile,
    options: CardGenerationOptions
  ): Promise<CardGenerationResult> {
    const session = await this.prepare(
      markdown,
      sourceFile,
      options
    );

    return this.save(session, sourceFile, options);
  }

  async prepare(
    markdown: string,
    sourceFile: TFile,
    options: CardGenerationOptions
  ): Promise<CardGenerationSession> {
    const preparedMarkdown = await prepareMarkdown(
      this.app,
      markdown,
      sourceFile,
      { stripFrontmatter: options.stripFrontmatter }
    );

    if (!preparedMarkdown) {
      throw new Error("没有可生成的内容");
    }

    const articleMarkdown = addFileNameTitle(
      preparedMarkdown,
      sourceFile.basename,
      options.useFileNameAsTitle
    );

    const template = getTemplate(options.templateId);
    const fixedBackgroundColor =
      typeof template.config.bgColor === "string"
        ? template.config.bgColor
        : "#ffffff";
    const { width, height } = getPageDimensions(
      options.pageRatio
    );
    const logoImage = this.resolveVaultImage(options.logoPath);
    const customCoverImage = this.resolveVaultImage(
      options.coverImagePath
    );
    const config: Record<string, unknown> = {
      ...template.config,
      ...(customCoverImage
        ? { coverImage: customCoverImage }
        : {}),
      hasCover: options.includeCover,
      coverTitle: options.coverTitle || sourceFile.basename,
      hasSignature: Boolean(options.signatureText.trim()),
      signatureText: options.signatureText.trim(),
      fontSize: options.fontSize,
      lineHeight: options.lineHeight,
      letterSpacing: options.letterSpacing,
      textPadding: options.textPadding,
      bgColor: fixedBackgroundColor,
      textColor: options.textColor,
      accentColor: options.accentColor,
      fontFamily: options.fontFamily || "inherit",
      logoImage,
      logoPosition: "left",
      logoSize: 30,
      logoPadding: 24,
      hasWatermark: Boolean(options.watermarkText.trim()),
      watermarkText: options.watermarkText.trim(),
      showPageNumber: options.showPageNumber,
      showGrid: false,
      canvasWidth: width,
      canvasHeight: height
    };

    await document.fonts?.ready;

    const splitter = new window.XHS_TEXT_CARD_CORE.TextSplitter(
      config,
      options.templateId
    );
    const pages = await splitter.split(articleMarkdown);

    if (pages.length === 0) {
      throw new Error("分页结果为空");
    }

    return {
      pages,
      config,
      templateId: options.templateId,
      width,
      height
    };
  }

  private resolveVaultImage(path: string): string {
    const trimmed = path.trim();

    if (!trimmed) {
      return "";
    }

    if (/^(?:data:|https?:|app:)/i.test(trimmed)) {
      return trimmed;
    }

    const file = this.app.vault.getAbstractFileByPath(
      normalizePath(trimmed)
    );

    return file instanceof TFile
      ? this.app.vault.getResourcePath(file)
      : "";
  }

  async save(
    session: CardGenerationSession,
    sourceFile: TFile,
    options: CardGenerationOptions
  ): Promise<CardGenerationResult> {
    const { pages, config, width, height } = session;

    if (
      options.maxPages > 0 &&
      pages.length > options.maxPages
    ) {
      throw new Error(
        `分页结果为 ${pages.length} 张，超过最大页数 ${options.maxPages}。请缩短内容、调小字号或增加最大页数`
      );
    }

    const outputFolder = await this.createRunFolder(
      options.outputFolder,
      sourceFile.basename,
      options.updateExisting,
      options.outputNameSuffix
    );
    const renderer =
      new window.XHS_TEXT_CARD_CORE.CanvasRenderer();
    const files: string[] = [];

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await renderer.render({
        layouts: pages[index] ?? [],
        index,
        totalCount: pages.length,
        config,
        templateId: session.templateId,
        width,
        height,
        scale: OUTPUT_WIDTH / width
      });

      const blob = await canvasToBlob(
        canvas,
        options.exportFormat
      );
      const extension =
        options.exportFormat === "jpeg" ? "jpg" : "png";
      const filePath = normalizePath(
        `${outputFolder}/${String(index + 1).padStart(2, "0")}.${extension}`
      );

      const data = await blob.arrayBuffer();
      const existing =
        this.app.vault.getAbstractFileByPath(filePath);

      if (existing instanceof TFile) {
        await this.app.vault.modifyBinary(existing, data);
      } else {
        await this.app.vault.createBinary(filePath, data);
      }
      files.push(filePath);

      // Release the backing store as soon as the page is persisted.
      canvas.width = 1;
      canvas.height = 1;
    }

    if (options.updateExisting) {
      await this.removeStaleImages(outputFolder, files);
    }

    return { files, outputFolder };
  }

  async renderPreviewPage(
    session: CardGenerationSession,
    index: number,
    scale = 1
  ): Promise<HTMLCanvasElement> {
    const layouts = session.pages[index];

    if (!layouts) {
      throw new Error("页面不存在");
    }

    const renderer =
      new window.XHS_TEXT_CARD_CORE.CanvasRenderer();

    return renderer.render({
      layouts,
      index,
      totalCount: session.pages.length,
      config: session.config,
      templateId: session.templateId,
      width: session.width,
      height: session.height,
      scale
    });
  }

  private async createRunFolder(
    configuredFolder: string,
    noteName: string,
    updateExisting: boolean,
    nameSuffix: string
  ): Promise<string> {
    const baseFolder = validateOutputFolder(configuredFolder);
    await this.ensureFolder(baseFolder);

    const safeNoteName = sanitizePathSegment(noteName);
    const safeSuffix = nameSuffix.trim()
      ? `-${sanitizePathSegment(nameSuffix)}`
      : "";

    if (updateExisting) {
      const stableFolder = normalizePath(
        `${baseFolder}/${safeNoteName}${safeSuffix}`
      );
      const existing =
        this.app.vault.getAbstractFileByPath(stableFolder);

      if (!existing) {
        await this.app.vault.createFolder(stableFolder);
      } else if (!(existing instanceof TFolder)) {
        throw new Error(`输出路径已被文件占用：${stableFolder}`);
      }

      return stableFolder;
    }

    const timestamp = formatTimestamp(new Date());
    let candidate = normalizePath(
      `${baseFolder}/${safeNoteName}${safeSuffix}-${timestamp}`
    );
    let suffix = 2;

    while (this.app.vault.getAbstractFileByPath(candidate)) {
      candidate = normalizePath(
        `${baseFolder}/${safeNoteName}${safeSuffix}-${timestamp}-${suffix}`
      );
      suffix += 1;
    }

    await this.app.vault.createFolder(candidate);
    return candidate;
  }

  private async removeStaleImages(
    folderPath: string,
    currentFiles: string[]
  ): Promise<void> {
    const folder =
      this.app.vault.getAbstractFileByPath(folderPath);

    if (!(folder instanceof TFolder)) {
      return;
    }

    const keep = new Set(currentFiles);
    const stale = folder.children.filter(
      (child): child is TFile =>
        child instanceof TFile &&
        /\.(?:png|jpe?g)$/i.test(child.name) &&
        !keep.has(child.path)
    );

    for (const file of stale) {
      await this.app.fileManager.trashFile(file);
    }
  }

  private async ensureFolder(path: string): Promise<void> {
    const parts = normalizePath(path)
      .split("/")
      .filter(Boolean);
    let current = "";

    for (const part of parts) {
      current = current ? `${current}/${part}` : part;

      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }
}

export function settingsToGenerationOptions(
  settings: XhsTextCardSettings,
  coverTitle: string
): CardGenerationOptions {
  return {
    ...settings,
    coverTitle
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat
): Promise<Blob> {
  const mimeType =
    format === "jpeg" ? "image/jpeg" : "image/png";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas 转换图片失败"));
        }
      },
      mimeType,
      format === "jpeg" ? 0.92 : undefined
    );
  });
}

function validateOutputFolder(folder: string): string {
  const trimmed = folder.trim().replace(/^\/+|\/+$/g, "");

  if (!trimmed) {
    throw new Error("输出目录不能为空");
  }

  if (trimmed.split("/").some((part) => part === "..")) {
    throw new Error("输出目录不能包含 ..");
  }

  return normalizePath(trimmed);
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|#^[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || "untitled";
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("") +
    "-" +
    [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join("");
}
