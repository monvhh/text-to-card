import "./styles.css";
import JSZip from "jszip";
import {
  getTemplate,
  getTemplateName,
  TEMPLATE_IDS,
  type TemplateId
} from "../src/templates";
import type { ExportFormat } from "../src/settings";
import { processPaginationDirectives } from "../src/utils/pagination-directives";
import { normalizeMarkdownFeatures } from "../src/utils/markdown-features";
import { summarizeCardLayout } from "../src/utils/layout-summary";
import {
  getPageDimensions,
  isPageRatio,
  type PageRatio
} from "../src/utils/page-ratio";
import {
  CUSTOM_FONT_PRESET_ID,
  findFontPresetByValue,
  FONT_PRESETS
} from "../src/utils/font-presets";

const SAMPLE_MARKDOWN = `# 把 Obsidian 笔记变成小红书图卡

写作继续留在你熟悉的 Markdown 中，排版和导出交给插件。

==这套预览器直接复用插件的 Canvas 引擎。==

## 为什么这样开发更快？

- 修改文字后自动分页
- 一键切换 12 款模板
- 不需要反复安装插件
- 内容始终保留在本地

> 浏览器负责高频视觉调试，Obsidian 只做最后一次集成验证。

<!-- xhs-hide-start -->
这段创作备注只保留在 Markdown 中，不会出现在卡片里。
<!-- xhs-hide-end -->

---

# 第二页：控制分页

在 Markdown 中输入三个短横线，可以强制从下一张卡片开始。

<!-- xhs-keep-start -->
## 保持完整

这段标题和说明会尽量放在同一张卡片中。
<!-- xhs-keep-end -->

你还可以调整字号、行高、封面标题和签名，然后下载单张或全部图片。
`;

const PREVIEW_WIDTH = 500;
const PREVIEW_SCALE = 1.4;
const EXPORT_SCALE = 1242 / PREVIEW_WIDTH;
const STORAGE_KEY = "xhs-text-card-preview-settings-v1";
const DEFAULT_LOGO_URL = "/logo.png";
const SHOW_ADVANCED_BLOCK_EDITOR = false;

interface PreviewSettings {
  templateId: TemplateId;
  pageRatio: PageRatio;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textPadding: number;
  bgColor: string;
  textColor: string;
  accentColor: string;
  includeCover: boolean;
  coverImageUrl: string;
  coverTitle: string;
  signatureText: string;
  watermarkText: string;
  showPageNumber: boolean;
  exportFormat: ExportFormat;
  maxPages: number;
  fontFamily: string;
  logoUrl: string;
  brandPresets: PreviewBrandPreset[];
}

interface PreviewBrandPreset {
  id: string;
  name: string;
  signatureText: string;
  watermarkText: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string;
}

const markdownInput = getElement<HTMLTextAreaElement>("markdown-input");
const templateSelect = getElement<HTMLSelectElement>("template-select");
const pageRatioSelect =
  getElement<HTMLSelectElement>("page-ratio");
const fontSizeInput = getElement<HTMLInputElement>("font-size");
const fontSizeOutput = getElement<HTMLOutputElement>("font-size-output");
const lineHeightInput = getElement<HTMLInputElement>("line-height");
const lineHeightOutput =
  getElement<HTMLOutputElement>("line-height-output");
const letterSpacingInput =
  getElement<HTMLInputElement>("letter-spacing");
const letterSpacingOutput =
  getElement<HTMLOutputElement>("letter-spacing-output");
const textPaddingInput =
  getElement<HTMLInputElement>("text-padding");
const textPaddingOutput =
  getElement<HTMLOutputElement>("text-padding-output");
const bgColorInput = getElement<HTMLInputElement>("bg-color");
const textColorInput =
  getElement<HTMLInputElement>("text-color");
const accentColorInput =
  getElement<HTMLInputElement>("accent-color");
const includeCoverInput =
  getElement<HTMLInputElement>("include-cover");
const coverImageUrlInput =
  getElement<HTMLInputElement>("cover-image-url");
const coverImageFileInput =
  getElement<HTMLInputElement>("cover-image-file");
const coverTitleInput =
  getElement<HTMLInputElement>("cover-title");
const signatureInput = getElement<HTMLInputElement>("signature");
const watermarkInput = getElement<HTMLInputElement>("watermark");
const showPageNumberInput =
  getElement<HTMLInputElement>("show-page-number");
const exportFormatSelect =
  getElement<HTMLSelectElement>("export-format");
const maxPagesInput =
  getElement<HTMLInputElement>("max-pages");
const fontFamilyInput =
  getElement<HTMLInputElement>("font-family");
const fontPresetSelect =
  getElement<HTMLSelectElement>("font-preset");
const logoUrlInput =
  getElement<HTMLInputElement>("logo-url");
const logoFileInput =
  getElement<HTMLInputElement>("logo-file");
const brandSelect =
  getElement<HTMLSelectElement>("brand-select");
const brandNameInput =
  getElement<HTMLInputElement>("brand-name");
const saveBrandButton =
  getElement<HTMLButtonElement>("save-brand");
const deleteBrandButton =
  getElement<HTMLButtonElement>("delete-brand");
const cardsElement = getElement<HTMLDivElement>("cards");
const pageCountElement = getElement<HTMLSpanElement>("page-count");
const renderStatusElement =
  getElement<HTMLSpanElement>("render-status");
const errorElement = getElement<HTMLDivElement>("error-message");
const warningElement =
  getElement<HTMLDivElement>("warning-message");
const downloadAllButton =
  getElement<HTMLButtonElement>("download-all");
const resetSampleButton =
  getElement<HTMLButtonElement>("reset-sample");
const resetStyleButton =
  getElement<HTMLButtonElement>("reset-style");

let activeTemplateId: TemplateId = "minimalist-magazine";
let renderVersion = 0;
let currentPages: unknown[][] = [];
let currentConfig: Record<string, unknown> = {};
const expandedPageIndexes = new Set<number>();
let currentRenderer =
  new window.XHS_TEXT_CARD_CORE.CanvasRenderer();
let renderTimer: number | undefined;
let pageOverflow = false;
let previewBrandPresets: PreviewBrandPreset[] = [];
let localLogoUrl = "";
let localCoverImageUrl = "";

initialize();

function initialize(): void {
  for (const templateId of TEMPLATE_IDS) {
    const option = createHtmlElement("option");
    option.value = templateId;
    option.textContent = getTemplateName(templateId);
    templateSelect.append(option);
  }

  for (const preset of FONT_PRESETS) {
    const option = createHtmlElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    fontPresetSelect.append(option);
  }
  const customFontOption = createHtmlElement("option");
  customFontOption.value = CUSTOM_FONT_PRESET_ID;
  customFontOption.textContent = "自定义字体";
  fontPresetSelect.append(customFontOption);

  const savedSettings = loadPreviewSettings();
  activeTemplateId =
    savedSettings?.templateId ?? activeTemplateId;
  markdownInput.value = SAMPLE_MARKDOWN;
  templateSelect.value = activeTemplateId;
  applyTemplateDefaults(activeTemplateId);

  if (savedSettings) {
    previewBrandPresets = savedSettings.brandPresets;
    applySavedSettings(savedSettings);
  } else {
    pageRatioSelect.value = "3:4";
    includeCoverInput.checked = true;
    coverTitleInput.value =
      "把 Obsidian 笔记变成小红书图卡";
    signatureInput.value = "";
    watermarkInput.value = "";
    showPageNumberInput.checked = true;
    exportFormatSelect.value = "png";
    maxPagesInput.value = "0";
    fontFamilyInput.value = "inherit";
    logoUrlInput.value = DEFAULT_LOGO_URL;
    coverImageUrlInput.value = "";
  }

  syncFontPresetSelection();
  populateBrandSelect();
  registerEvents();
  void renderPreview();
}

function registerEvents(): void {
  markdownInput.addEventListener("input", scheduleRender);
  coverTitleInput.addEventListener("input", scheduleRender);
  signatureInput.addEventListener("input", scheduleRender);
  watermarkInput.addEventListener("input", handleSettingChange);
  includeCoverInput.addEventListener("change", scheduleRender);
  coverImageUrlInput.addEventListener(
    "input",
    handleSettingChange
  );
  coverImageFileInput.addEventListener("change", () => {
    localCoverImageUrl = replaceLocalImageUrl(
      localCoverImageUrl,
      coverImageFileInput.files?.[0]
    );
    scheduleRender();
  });
  showPageNumberInput.addEventListener(
    "change",
    handleSettingChange
  );
  bgColorInput.addEventListener("input", handleSettingChange);
  textColorInput.addEventListener("input", handleSettingChange);
  accentColorInput.addEventListener("input", handleSettingChange);
  exportFormatSelect.addEventListener(
    "change",
    savePreviewSettings
  );
  maxPagesInput.addEventListener("input", handleSettingChange);
  fontFamilyInput.addEventListener("input", handleSettingChange);
  fontFamilyInput.addEventListener(
    "change",
    syncFontPresetSelection
  );
  fontPresetSelect.addEventListener("change", () => {
    const preset = FONT_PRESETS.find(
      (item) => item.id === fontPresetSelect.value
    );

    if (preset) {
      fontFamilyInput.value = preset.value;
      handleSettingChange();
    }
  });
  logoUrlInput.addEventListener("input", handleSettingChange);
  logoFileInput.addEventListener("change", () => {
    localLogoUrl = replaceLocalImageUrl(
      localLogoUrl,
      logoFileInput.files?.[0]
    );
    scheduleRender();
  });
  coverTitleInput.addEventListener("change", savePreviewSettings);
  signatureInput.addEventListener("change", savePreviewSettings);
  includeCoverInput.addEventListener(
    "change",
    savePreviewSettings
  );

  fontSizeInput.addEventListener("input", () => {
    updateRangeOutputs();
    handleSettingChange();
  });

  lineHeightInput.addEventListener("input", () => {
    updateRangeOutputs();
    handleSettingChange();
  });

  letterSpacingInput.addEventListener("input", () => {
    updateRangeOutputs();
    handleSettingChange();
  });

  textPaddingInput.addEventListener("input", () => {
    updateRangeOutputs();
    handleSettingChange();
  });

  templateSelect.addEventListener("change", () => {
    activeTemplateId = templateSelect.value as TemplateId;
    applyTemplateDefaults(activeTemplateId);
    currentRenderer =
      new window.XHS_TEXT_CARD_CORE.CanvasRenderer();
    handleSettingChange();
  });
  pageRatioSelect.addEventListener(
    "change",
    handleSettingChange
  );

  resetSampleButton.addEventListener("click", () => {
    markdownInput.value = SAMPLE_MARKDOWN;
    coverTitleInput.value =
      "把 Obsidian 笔记变成小红书图卡";
    savePreviewSettings();
    scheduleRender();
  });

  resetStyleButton.addEventListener("click", () => {
    applyTemplateDefaults(activeTemplateId);
    watermarkInput.value = "";
    showPageNumberInput.checked = true;
    handleSettingChange();
  });

  downloadAllButton.addEventListener("click", () => {
    void downloadAllPages();
  });

  saveBrandButton.addEventListener("click", saveCurrentBrand);
  deleteBrandButton.addEventListener("click", deleteSelectedBrand);
  brandSelect.addEventListener("change", applySelectedBrand);
}

function applyTemplateDefaults(templateId: TemplateId): void {
  const template = getTemplate(templateId);
  fontSizeInput.value = String(template.config.fontSize ?? 17);
  lineHeightInput.value = String(template.config.lineHeight ?? 1.8);
  letterSpacingInput.value = String(
    template.config.letterSpacing ?? 0.5
  );
  textPaddingInput.value = String(
    template.config.textPadding ?? 40
  );
  bgColorInput.value = normalizeHexColor(
    template.config.bgColor,
    "#ffffff"
  );
  textColorInput.value = normalizeHexColor(
    template.config.textColor,
    "#222222"
  );
  accentColorInput.value = normalizeHexColor(
    template.config.accentColor,
    "#f44830"
  );
  fontFamilyInput.value =
    typeof template.config.fontFamily === "string"
      ? template.config.fontFamily
      : "inherit";
  syncFontPresetSelection();
  updateRangeOutputs();
}

function updateRangeOutputs(): void {
  fontSizeOutput.value = `${fontSizeInput.value}px`;
  lineHeightOutput.value = lineHeightInput.value;
  letterSpacingOutput.value = `${letterSpacingInput.value}px`;
  textPaddingOutput.value = `${textPaddingInput.value}px`;
}

function handleSettingChange(): void {
  savePreviewSettings();
  scheduleRender();
}

function scheduleRender(): void {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    void renderPreview();
  }, 180);
}

async function renderPreview(): Promise<void> {
  const version = ++renderVersion;
  setRenderingState(true);
  hideError();

  try {
    const markdown = processPaginationDirectives(
      normalizeMarkdownFeatures(markdownInput.value.trim())
    );

    if (!markdown) {
      currentPages = [];
      pageOverflow = false;
      cardsElement.replaceChildren(
        createEmptyState("输入 Markdown 后将在这里显示卡片")
      );
      updatePageCount(0);
      hideWarning();
      return;
    }

    await document.fonts?.ready;
    const template = getTemplate(activeTemplateId);
    const fixedBackgroundColor = normalizeHexColor(
      template.config.bgColor,
      "#ffffff"
    );
    const { width, height } = getCurrentPageDimensions();
    const signatureText = signatureInput.value.trim();
    const logoImage =
      localLogoUrl || logoUrlInput.value.trim();
    const config: Record<string, unknown> = {
      ...template.config,
      fontSize: Number(fontSizeInput.value),
      lineHeight: Number(lineHeightInput.value),
      letterSpacing: Number(letterSpacingInput.value),
      textPadding: Number(textPaddingInput.value),
      bgColor: fixedBackgroundColor,
      textColor: textColorInput.value,
      accentColor: accentColorInput.value,
      fontFamily: fontFamilyInput.value.trim() || "inherit",
      logoImage,
      logoPosition: "left",
      logoSize: 30,
      logoPadding: 24,
      hasCover: includeCoverInput.checked,
      coverImage:
        localCoverImageUrl ||
        coverImageUrlInput.value.trim() ||
        template.config.coverImage,
      coverTitle:
        coverTitleInput.value.trim() || "未命名文档",
      hasSignature: Boolean(signatureText),
      signatureText,
      hasWatermark: Boolean(watermarkInput.value.trim()),
      watermarkText: watermarkInput.value.trim(),
      showPageNumber: showPageNumberInput.checked,
      showGrid: false,
      canvasWidth: width,
      canvasHeight: height
    };

    const splitter =
      new window.XHS_TEXT_CARD_CORE.TextSplitter(
        config,
        activeTemplateId
      );
    const pages = await splitter.split(markdown);

    if (version !== renderVersion) {
      return;
    }

    const cardNodes = await Promise.all(
      pages.map(async (layouts, index) => {
        const canvas = await currentRenderer.render({
          layouts,
          index,
          totalCount: pages.length,
          config,
          templateId: activeTemplateId,
          width,
          height,
          scale: PREVIEW_SCALE
        });

        return createCardNode(
          canvas,
          index,
          pages.length,
          layouts
        );
      })
    );

    if (version !== renderVersion) {
      return;
    }

    currentPages = pages;
    currentConfig = config;
    cardsElement.replaceChildren(...cardNodes);
    updatePageCount(pages.length);
    const maxPages = readMaxPages();
    pageOverflow =
      maxPages > 0 && pages.length > maxPages;

    if (pageOverflow) {
      showWarning(
        `当前生成 ${pages.length} 张，超过最大页数 ${maxPages}。ZIP 下载已暂停，请缩短内容、调小字号或提高限制。`
      );
    } else {
      hideWarning();
    }
    downloadAllButton.disabled = pageOverflow;
  } catch (error) {
    if (version !== renderVersion) {
      return;
    }

    currentPages = [];
    pageOverflow = false;
    updatePageCount(0);
    hideWarning();
    showError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    if (version === renderVersion) {
      setRenderingState(false);
    }
  }
}

function createCardNode(
  canvas: HTMLCanvasElement,
  index: number,
  totalCount: number,
  layouts: unknown[]
): HTMLElement {
  const article = createHtmlElement("article");
  article.className = "card-item";

  const header = createHtmlElement("div");
  header.className = "card-item-header";

  const label = createHtmlElement("span");
  label.textContent = `第 ${index + 1} 张 / 共 ${totalCount} 张`;

  const downloadButton = createHtmlElement("button");
  downloadButton.type = "button";
  downloadButton.className = "card-download";
  downloadButton.textContent = "下载";
  downloadButton.addEventListener("click", () => {
    void downloadPage(index);
  });

  const actions = createHtmlElement("div");
  actions.className = "card-item-actions";
  actions.append(
    createPageAction("隐藏", totalCount > 1, () => {
      currentPages.splice(index, 1);
      void renderEditedPages();
    }),
    downloadButton
  );

  canvas.className = "preview-canvas";
  header.append(label, actions);
  article.append(header, canvas);
  if (SHOW_ADVANCED_BLOCK_EDITOR) {
    article.append(createBlockEditor(index, layouts));
  }
  return article;
}

function createBlockEditor(
  pageIndex: number,
  page: unknown[]
): HTMLElement {
  const details = createHtmlElement("details");
  details.className = "card-block-editor";
  details.open = expandedPageIndexes.has(pageIndex);
  details.addEventListener("toggle", () => {
    if (details.open) {
      expandedPageIndexes.add(pageIndex);
    } else {
      expandedPageIndexes.delete(pageIndex);
    }
  });

  const summary = createHtmlElement("summary");
  summary.className = "card-block-summary";
  summary.append(
    document.createTextNode(`调整内容（${page.length} 块）`),
    createElement("span", "高级", "card-block-hint")
  );

  const list = createHtmlElement("div");
  list.className = "card-block-list";

  page.forEach((layout, blockIndex) => {
    const item = createHtmlElement("div");
    item.className = "card-block-item";

    const description = createHtmlElement("div");
    description.className = "card-block-description";
    const blockSummary = summarizeCardLayout(layout);
    description.append(
      createElement(
        "span",
        blockSummary.label,
        "card-block-type"
      ),
      createElement(
        "span",
        blockSummary.text,
        "card-block-text"
      )
    );

    const actions = createHtmlElement("div");
    actions.className = "card-block-actions";
    actions.append(
      createBlockAction("↑", blockIndex > 0, () => {
        swapItems(page, blockIndex, blockIndex - 1);
      }, "在本张卡片中上移"),
      createBlockAction(
        "↓",
        blockIndex < page.length - 1,
        () => {
          swapItems(page, blockIndex, blockIndex + 1);
        },
        "在本张卡片中下移"
      ),
      createBlockAction("上一张", pageIndex > 0, () => {
        const [moved] = page.splice(blockIndex, 1);
        currentPages[pageIndex - 1]?.push(moved);
        removeEmptyPage(pageIndex);
      }),
      createBlockAction(
        "下一张",
        pageIndex < currentPages.length - 1,
        () => {
          const [moved] = page.splice(blockIndex, 1);
          currentPages[pageIndex + 1]?.unshift(moved);
          removeEmptyPage(pageIndex);
        }
      ),
      createBlockAction(
        "从这里分页",
        blockIndex > 0,
        () => {
          const nextPage = page.splice(blockIndex);
          currentPages.splice(pageIndex + 1, 0, nextPage);
        }
      ),
      createBlockAction(
        "不导出",
        page.length > 1 || currentPages.length > 1,
        () => {
          page.splice(blockIndex, 1);
          removeEmptyPage(pageIndex);
        }
      )
    );

    item.append(description, actions);
    list.append(item);
  });

  details.append(summary, list);
  return details;
}

function createBlockAction(
  label: string,
  enabled: boolean,
  action: () => void,
  tooltip?: string
): HTMLButtonElement {
  const button = createElement(
    "button",
    label,
    "card-download"
  );
  button.type = "button";
  button.disabled = !enabled;
  if (tooltip) {
    button.title = tooltip;
    button.setAttribute("aria-label", tooltip);
  }
  button.addEventListener("click", () => {
    action();
    void renderEditedPages();
  });
  return button;
}

function createHtmlElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K
): HTMLElementTagNameMap[K];
function createHtmlElement(tagName: string): HTMLElement {
  return document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    tagName
  );
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  text: string,
  className: string
): HTMLElementTagNameMap[K] {
  const element = createHtmlElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createPageAction(
  label: string,
  enabled: boolean,
  action: () => void
): HTMLButtonElement {
  const button = createHtmlElement("button");
  button.type = "button";
  button.className = "card-download";
  button.textContent = label;
  button.disabled = !enabled;
  button.addEventListener("click", action);
  return button;
}

function swapItems<T>(items: T[], a: number, b: number): void {
  const first = items[a];
  const second = items[b];

  if (first === undefined || second === undefined) {
    return;
  }

  items[a] = second;
  items[b] = first;
}

function removeEmptyPage(pageIndex: number): void {
  if (
    currentPages[pageIndex]?.length === 0 &&
    currentPages.length > 1
  ) {
    currentPages.splice(pageIndex, 1);
  }
}

async function renderEditedPages(): Promise<void> {
  const version = ++renderVersion;
  setRenderingState(true);
  hideError();

  try {
    const { width, height } = getCurrentPageDimensions();
    const cardNodes = await Promise.all(
      currentPages.map(async (layouts, index) => {
        const canvas = await currentRenderer.render({
          layouts,
          index,
          totalCount: currentPages.length,
          config: currentConfig,
          templateId: activeTemplateId,
          width,
          height,
          scale: PREVIEW_SCALE
        });

        return createCardNode(
          canvas,
          index,
          currentPages.length,
          layouts
        );
      })
    );

    if (version !== renderVersion) {
      return;
    }

    cardsElement.replaceChildren(...cardNodes);
    updatePageCount(currentPages.length);
    updateOverflowState();
  } catch (error) {
    showError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    if (version === renderVersion) {
      setRenderingState(false);
    }
  }
}

function updateOverflowState(): void {
  const maxPages = readMaxPages();
  pageOverflow =
    maxPages > 0 && currentPages.length > maxPages;

  if (pageOverflow) {
    showWarning(
      `当前生成 ${currentPages.length} 张，超过最大页数 ${maxPages}。ZIP 下载已暂停，请缩短内容、调小字号或提高限制。`
    );
  } else {
    hideWarning();
  }

  downloadAllButton.disabled = pageOverflow;
}

async function downloadPage(index: number): Promise<void> {
  const layouts = currentPages[index];

  if (!layouts) {
    return;
  }

  setDownloadState(true, `正在导出第 ${index + 1} 张…`);

  try {
    const { width, height } = getCurrentPageDimensions();
    const canvas = await currentRenderer.render({
      layouts,
      index,
      totalCount: currentPages.length,
      config: currentConfig,
      templateId: activeTemplateId,
      width,
      height,
      scale: EXPORT_SCALE
    });

    await saveCanvas(
      canvas,
      index,
      exportFormatSelect.value as ExportFormat
    );
    canvas.width = 1;
    canvas.height = 1;
  } catch (error) {
    showError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    setDownloadState(false);
  }
}

async function downloadAllPages(): Promise<void> {
  if (pageOverflow) {
    showWarning("当前页数超过限制，暂不能下载 ZIP");
    return;
  }

  if (currentPages.length === 0) {
    showError("没有可下载的卡片");
    return;
  }

  hideError();
  setDownloadState(true, "正在准备 ZIP…");

  try {
    const { width, height } = getCurrentPageDimensions();
    const zip = new JSZip();
    const format =
      exportFormatSelect.value as ExportFormat;
    const extension = format === "jpeg" ? "jpg" : "png";

    for (let index = 0; index < currentPages.length; index += 1) {
      setDownloadState(
        true,
        `正在渲染 ${index + 1}/${currentPages.length}`
      );
      const canvas = await currentRenderer.render({
        layouts: currentPages[index] ?? [],
        index,
        totalCount: currentPages.length,
        config: currentConfig,
        templateId: activeTemplateId,
        width,
        height,
        scale: EXPORT_SCALE
      });

      const blob = await canvasToBlob(canvas, format);
      zip.file(
        `card-${String(index + 1).padStart(2, "0")}.${extension}`,
        blob
      );
      canvas.width = 1;
      canvas.height = 1;
    }

    setDownloadState(true, "正在压缩 ZIP…");
    const archive = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    saveBlob(
      archive,
      `xhs-cards-${formatTimestamp(new Date())}.zip`
    );
  } catch (error) {
    showError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    setDownloadState(false);
  }
}

async function saveCanvas(
  canvas: HTMLCanvasElement,
  index: number,
  format: ExportFormat
): Promise<void> {
  const blob = await canvasToBlob(canvas, format);
  const extension = format === "jpeg" ? "jpg" : "png";

  saveBlob(
    blob,
    `xhs-card-${String(index + 1).padStart(2, "0")}.${extension}`
  );
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = createHtmlElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas 转换图片失败"));
        }
      },
      format === "jpeg" ? "image/jpeg" : "image/png",
      format === "jpeg" ? 0.92 : undefined
    );
  });
}

function setRenderingState(rendering: boolean): void {
  renderStatusElement.textContent = rendering
    ? "正在渲染…"
    : "实时预览已更新";
  renderStatusElement.classList.toggle("is-rendering", rendering);
}

function setDownloadState(
  downloading: boolean,
  message = "下载 ZIP"
): void {
  downloadAllButton.disabled = downloading;
  if (!downloading) {
    downloadAllButton.disabled = pageOverflow;
  }
  downloadAllButton.textContent = downloading
    ? message
    : "下载 ZIP";
}

function updatePageCount(count: number): void {
  pageCountElement.textContent = `${count} 张`;
}

function showError(message: string): void {
  errorElement.textContent = message;
  errorElement.hidden = false;
}

function hideError(): void {
  errorElement.hidden = true;
  errorElement.textContent = "";
}

function showWarning(message: string): void {
  warningElement.textContent = message;
  warningElement.hidden = false;
}

function hideWarning(): void {
  warningElement.hidden = true;
  warningElement.textContent = "";
}

function createEmptyState(message: string): HTMLElement {
  const element = createHtmlElement("div");
  element.className = "empty-state";
  element.textContent = message;
  return element;
}

function loadPreviewSettings(): PreviewSettings | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const value = JSON.parse(raw) as Partial<PreviewSettings>;

    if (!isTemplateId(value.templateId)) {
      return null;
    }

    return {
      templateId: value.templateId,
      pageRatio: isPageRatio(value.pageRatio)
        ? value.pageRatio
        : "3:4",
      fontSize:
        value.templateId === "minimalist-magazine" &&
        readFiniteNumber(value.fontSize, 18) === 14
          ? 18
          : readFiniteNumber(value.fontSize, 18),
      lineHeight: readFiniteNumber(value.lineHeight, 1.8),
      letterSpacing: readFiniteNumber(
        value.letterSpacing,
        0.5
      ),
      textPadding: readFiniteNumber(value.textPadding, 40),
      bgColor: normalizeHexColor(value.bgColor, "#ffffff"),
      textColor: normalizeHexColor(
        value.textColor,
        "#222222"
      ),
      accentColor: normalizeHexColor(
        value.accentColor,
        "#f44830"
      ),
      includeCover: value.includeCover !== false,
      coverImageUrl:
        typeof value.coverImageUrl === "string"
          ? value.coverImageUrl
          : "",
      coverTitle:
        typeof value.coverTitle === "string"
          ? value.coverTitle
          : "把 Obsidian 笔记变成小红书图卡",
      signatureText:
        typeof value.signatureText === "string"
          ? value.signatureText
          : "",
      watermarkText:
        typeof value.watermarkText === "string"
          ? value.watermarkText
          : "",
      showPageNumber: value.showPageNumber !== false,
      exportFormat:
        value.exportFormat === "jpeg" ? "jpeg" : "png",
      maxPages: clampInteger(value.maxPages, 0, 50),
      fontFamily:
        typeof value.fontFamily === "string"
          ? value.fontFamily
          : "inherit",
      logoUrl:
        typeof value.logoUrl === "string" &&
        value.logoUrl.trim() &&
        value.logoUrl !== "/shanjian-psychology-logo.png" &&
        !value.logoUrl.startsWith(
          "https://counseling.anxinli.com/assets/favicon-black.png"
        )
          ? value.logoUrl
          : DEFAULT_LOGO_URL,
      brandPresets: Array.isArray(value.brandPresets)
        ? value.brandPresets.filter(isPreviewBrandPreset)
        : []
    };
  } catch {
    return null;
  }
}

function applySavedSettings(settings: PreviewSettings): void {
  activeTemplateId = settings.templateId;
  templateSelect.value = settings.templateId;
  pageRatioSelect.value = settings.pageRatio;
  fontSizeInput.value = String(settings.fontSize);
  lineHeightInput.value = String(settings.lineHeight);
  letterSpacingInput.value = String(settings.letterSpacing);
  textPaddingInput.value = String(settings.textPadding);
  bgColorInput.value = normalizeHexColor(
    getTemplate(settings.templateId).config.bgColor,
    "#ffffff"
  );
  textColorInput.value = settings.textColor;
  accentColorInput.value = settings.accentColor;
  includeCoverInput.checked = settings.includeCover;
  coverImageUrlInput.value = settings.coverImageUrl;
  coverTitleInput.value = settings.coverTitle;
  signatureInput.value = settings.signatureText;
  watermarkInput.value = settings.watermarkText;
  showPageNumberInput.checked = settings.showPageNumber;
  exportFormatSelect.value = settings.exportFormat;
  maxPagesInput.value = String(settings.maxPages);
  fontFamilyInput.value = settings.fontFamily;
  syncFontPresetSelection();
  logoUrlInput.value = settings.logoUrl;
  updateRangeOutputs();
}

function savePreviewSettings(): void {
  const settings: PreviewSettings = {
    templateId: activeTemplateId,
    pageRatio: getSelectedPageRatio(),
    fontSize: Number(fontSizeInput.value),
    lineHeight: Number(lineHeightInput.value),
    letterSpacing: Number(letterSpacingInput.value),
    textPadding: Number(textPaddingInput.value),
    bgColor: bgColorInput.value,
    textColor: textColorInput.value,
    accentColor: accentColorInput.value,
    includeCover: includeCoverInput.checked,
    coverImageUrl: coverImageUrlInput.value.trim(),
    coverTitle: coverTitleInput.value,
    signatureText: signatureInput.value,
    watermarkText: watermarkInput.value,
    showPageNumber: showPageNumberInput.checked,
    exportFormat:
      exportFormatSelect.value === "jpeg" ? "jpeg" : "png",
    maxPages: readMaxPages(),
    fontFamily: fontFamilyInput.value.trim() || "inherit",
    logoUrl: logoUrlInput.value.trim(),
    brandPresets: previewBrandPresets
  };

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // Preview still works when storage is unavailable.
  }
}

function getSelectedPageRatio(): PageRatio {
  return isPageRatio(pageRatioSelect.value)
    ? pageRatioSelect.value
    : "3:4";
}

function getCurrentPageDimensions(): {
  width: number;
  height: number;
} {
  return getPageDimensions(getSelectedPageRatio());
}

function syncFontPresetSelection(): void {
  fontPresetSelect.value =
    findFontPresetByValue(fontFamilyInput.value.trim())?.id ??
    CUSTOM_FONT_PRESET_ID;
}

function replaceLocalImageUrl(
  previousUrl: string,
  file: File | undefined
): string {
  if (previousUrl) {
    URL.revokeObjectURL(previousUrl);
  }

  return file ? URL.createObjectURL(file) : "";
}

function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" &&
    TEMPLATE_IDS.includes(value as TemplateId);
}

function normalizeHexColor(
  value: unknown,
  fallback: string
): string {
  return typeof value === "string" &&
    /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}

function readFiniteNumber(
  value: unknown,
  fallback: number
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readMaxPages(): number {
  return clampInteger(Number(maxPagesInput.value), 0, 50);
}

function clampInteger(
  value: unknown,
  min: number,
  max: number
): number {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(min, Math.trunc(number))
  );
}

function populateBrandSelect(selectedId = ""): void {
  brandSelect.replaceChildren();
  const empty = createHtmlElement("option");
  empty.value = "";
  empty.textContent = "不使用预设";
  brandSelect.append(empty);

  for (const preset of previewBrandPresets) {
    const option = createHtmlElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    brandSelect.append(option);
  }

  brandSelect.value = selectedId;
}

function saveCurrentBrand(): void {
  const name = brandNameInput.value.trim();

  if (!name) {
    showError("请填写品牌预设名称");
    return;
  }

  hideError();
  const preset: PreviewBrandPreset = {
    id: `brand-${Date.now().toString(36)}`,
    name,
    signatureText: signatureInput.value,
    watermarkText: watermarkInput.value,
    bgColor: bgColorInput.value,
    textColor: textColorInput.value,
    accentColor: accentColorInput.value,
    fontFamily: fontFamilyInput.value.trim() || "inherit",
    logoUrl: logoUrlInput.value.trim()
  };
  previewBrandPresets = [...previewBrandPresets, preset];
  brandNameInput.value = "";
  populateBrandSelect(preset.id);
  savePreviewSettings();
}

function deleteSelectedBrand(): void {
  const id = brandSelect.value;

  if (!id) {
    showError("请先选择要删除的品牌预设");
    return;
  }

  previewBrandPresets = previewBrandPresets.filter(
    (preset) => preset.id !== id
  );
  populateBrandSelect();
  savePreviewSettings();
  hideError();
}

function applySelectedBrand(): void {
  const preset = previewBrandPresets.find(
    (item) => item.id === brandSelect.value
  );

  if (!preset) {
    return;
  }

  signatureInput.value = preset.signatureText;
  watermarkInput.value = preset.watermarkText;
  bgColorInput.value = preset.bgColor;
  textColorInput.value = preset.textColor;
  accentColorInput.value = preset.accentColor;
  fontFamilyInput.value = preset.fontFamily;
  logoUrlInput.value = preset.logoUrl;
  handleSettingChange();
}

function isPreviewBrandPreset(
  value: unknown
): value is PreviewBrandPreset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const preset = value as Record<string, unknown>;
  return [
    "id",
    "name",
    "signatureText",
    "watermarkText",
    "bgColor",
    "textColor",
    "accentColor",
    "fontFamily",
    "logoUrl"
  ].every((key) => typeof preset[key] === "string");
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`缺少页面元素：${id}`);
  }

  return element as T;
}
