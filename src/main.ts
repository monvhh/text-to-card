import {
  type Editor,
  type EditorPosition,
  getAllTags,
  MarkdownView,
  Notice,
  Plugin,
  TFile
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  migrateSettings,
  type XhsTextCardSettings
} from "./settings";
import {
  CardGenerator,
  type CardGenerationOptions,
  type CardGenerationResult,
  type CardGenerationSession
} from "./services/card-generator";
import {
  appendGeneratedImageLinks,
  copyVaultImageToClipboard,
  insertGeneratedImageLinks,
  revealGeneratedFile,
  shareGeneratedFiles
} from "./services/post-generation";
import { GenerateCardsModal } from "./ui/generate-modal";
import {
  BatchGenerateModal,
  type BatchGenerationOptions
} from "./ui/batch-modal";
import { PageEditorModal } from "./ui/page-editor-modal";
import { XhsTextCardSettingTab } from "./ui/settings-tab";
import {
  formatGenerationError,
  toGenerationError
} from "./services/generation-errors";
import {
  exportPresetsToVault,
  importPresetsFromVault
} from "./services/preset-files";
import { JsonFileSuggestModal } from "./ui/json-file-suggest-modal";
import { applyFrontmatterSettings } from "./utils/frontmatter-settings";
import {
  TEMPLATE_IDS,
  type TemplateId
} from "./templates";
import {
  isPathInFolder,
  matchesNormalizedTag,
  parseTemplateIds
} from "./utils/batch";

export default class XhsTextCardPlugin extends Plugin {
  settings: XhsTextCardSettings = { ...DEFAULT_SETTINGS };
  private generator!: CardGenerator;
  private isGenerating = false;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.generator = new CardGenerator(this.app);

    this.addRibbonIcon(
      "images",
      "Make cards",
      () => this.makeForActiveNote()
    );

    this.addCommand({
      id: "generate-cards",
      name: "Make cards",
      editorCallback: (editor, view) => {
        if (!view.file) {
          new Notice("请先打开一个 Markdown 文件");
          return;
        }

        void this.makeFromEditor(editor, view.file);
      }
    });

    this.addCommand({
      id: "preview-cards",
      name: "Preview cards",
      editorCallback: (editor, view) => {
        if (!view.file) {
          new Notice("请先打开一个 Markdown 文件");
          return;
        }

        this.previewFromEditor(editor, view.file);
      }
    });

    this.addCommand({
      id: "batch-generate-cards",
      name: "Make cards in batch",
      callback: () => this.openBatchGenerator()
    });

    this.addCommand({
      id: "open-last-generated-cards",
      name: "Open last generated cards",
      callback: () => void this.openLastGeneration()
    });

    this.addCommand({
      id: "share-last-generated-cards",
      name: "Share last generated cards",
      callback: () => void this.shareLastGeneration()
    });

    this.addCommand({
      id: "export-card-presets",
      name: "Export presets",
      callback: () => void this.exportPresets()
    });

    this.addCommand({
      id: "import-card-presets",
      name: "Import presets",
      callback: () => this.openImportPresets()
    });

    this.registerObsidianProtocolHandler(
      "xhs-text-card",
      (params) => {
        void this.handleProtocol(params);
      }
    );

    this.registerEvent(
      this.app.workspace.on(
        "editor-menu",
        (menu, editor, info) => {
          if (!info.file) {
            return;
          }

          menu.addItem((item) => {
            item
              .setTitle("Make cards")
              .setIcon("images")
              .onClick(() => {
                void this.makeFromEditor(editor, info.file!);
              });
          });
        }
      )
    );

    this.registerEvent(
      this.app.workspace.on(
        "file-menu",
        (menu, file) => {
          if (
            !(file instanceof TFile) ||
            file.extension !== "md"
          ) {
            return;
          }

          menu.addItem((item) => {
            item
              .setTitle("Make cards")
              .setIcon("images")
              .onClick(() => {
                void this.makeFromFile(file);
              });
          });
        }
      )
    );

    this.addSettingTab(
      new XhsTextCardSettingTab(this.app, this)
    );
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as
      | Record<string, unknown>
      | null;
    const migration = migrateSettings(saved);
    this.settings = migration.settings;

    if (migration.migrated && saved) {
      await this.saveData(this.settings);
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async openLastGeneration(): Promise<void> {
    const firstFile = this.settings.lastGeneration?.files[0];
    if (!firstFile) {
      new Notice("还没有生成记录");
      return;
    }
    try {
      await revealGeneratedFile(this.app, firstFile);
    } catch (error) {
      new Notice(
        `上次生成的文件已不存在：${
          error instanceof Error ? error.message : String(error)
        }`,
        8000
      );
    }
  }

  async shareLastGeneration(): Promise<void> {
    const record = this.settings.lastGeneration;
    if (!record?.files.length) {
      new Notice("还没有可分享的生成记录");
      return;
    }
    try {
      await shareGeneratedFiles(
        this.app,
        record.files,
        record.sourcePath.split("/").pop()?.replace(/\.md$/i, "") ??
          "Text to Card"
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      new Notice(
        `分享失败：${
          error instanceof Error ? error.message : String(error)
        }`,
        8000
      );
    }
  }

  async exportPresets(): Promise<void> {
    try {
      const path = await exportPresetsToVault(
        this.app,
        this.settings
      );
      new Notice(`预设已导出：${path}`, 8000);
    } catch (error) {
      new Notice(
        `导出预设失败：${
          error instanceof Error ? error.message : String(error)
        }`,
        8000
      );
    }
  }

  openImportPresets(): void {
    new JsonFileSuggestModal(this.app, (file) => {
      void (async () => {
        try {
          this.settings = await importPresetsFromVault(
            this.app,
            this.settings,
            file
          );
          await this.saveSettings();
          new Notice("预设导入完成");
        } catch (error) {
          new Notice(
            `导入预设失败：${
              error instanceof Error ? error.message : String(error)
            }`,
            8000
          );
        }
      })();
    }).open();
  }

  private makeForActiveNote(): void {
    const view =
      this.app.workspace.getActiveViewOfType(MarkdownView);

    if (!view?.file) {
      new Notice("请先打开一个 Markdown 文件");
      return;
    }

    void this.makeFromEditor(view.editor, view.file);
  }

  private async makeFromEditor(
    editor: Editor,
    file: TFile
  ): Promise<void> {
    const selection = editor.getSelection();
    const insertionPosition = selection
      ? editor.getCursor("to")
      : getDocumentEnd(editor);

    await this.generateDirectly(
      selection || editor.getValue(),
      file,
      { editor, insertionPosition }
    );
  }

  private async makeFromFile(file: TFile): Promise<void> {
    const markdown = await this.app.vault.cachedRead(file);

    await this.generateDirectly(markdown, file, {});
  }

  private previewFromEditor(
    editor: Editor,
    file: TFile
  ): void {
    const selection = editor.getSelection();
    const insertionPosition = selection
      ? editor.getCursor("to")
      : getDocumentEnd(editor);

    this.openPreview(
      selection || editor.getValue(),
      file,
      { editor, insertionPosition }
    );
  }

  private async previewFromFile(file: TFile): Promise<void> {
    const markdown = await this.app.vault.cachedRead(file);

    this.openPreview(markdown, file, {});
  }

  private openBatchGenerator(): void {
    if (this.isGenerating) {
      new Notice("已有生成任务正在进行");
      return;
    }

    new BatchGenerateModal(
      this.app,
      this.settings.templateId,
      async (options) => {
        await this.runBatch(options);
      }
    ).open();
  }

  private async runBatch(
    options: BatchGenerationOptions,
    exactFiles?: TFile[]
  ): Promise<void> {
    if (this.isGenerating) {
      new Notice("已有生成任务正在进行");
      return;
    }

    const files =
      exactFiles ??
      this.app.vault
        .getMarkdownFiles()
        .filter((file) =>
          isPathInFolder(file.path, options.folder)
        )
        .filter((file) => this.matchesTag(file, options.tag));

    if (files.length === 0) {
      new Notice("没有找到符合条件的 Markdown 文件");
      return;
    }

    this.isGenerating = true;
    const notice = new Notice(
      `准备批量生成 ${files.length} 篇笔记……`,
      0
    );
    let succeeded = 0;
    const failures: string[] = [];

    try {
      for (const [fileIndex, file] of files.entries()) {
        const markdown = await this.app.vault.cachedRead(file);
        const frontmatter =
          this.app.metadataCache.getFileCache(file)?.frontmatter;
        const resolved = applyFrontmatterSettings(
          this.settings,
          frontmatter
        );

        for (const templateId of options.templateIds) {
          notice.setMessage(
            `正在处理 ${fileIndex + 1}/${files.length}：${file.basename} · ${templateId}`
          );

          const generationOptions: CardGenerationOptions = {
            ...resolved.settings,
            templateId,
            templateSelection: templateId,
            coverTitle:
              resolved.coverTitle ?? file.basename,
            updateExisting: options.updateExisting,
            outputNameSuffix: templateId,
            insertLinksAfterGenerate: false,
            copyFirstImageAfterGenerate: false,
            revealOutputAfterGenerate: false
          };

          try {
            await this.generator.generate(
              markdown,
              file,
              generationOptions,
              (progress) => {
                notice.setMessage(
                  `${fileIndex + 1}/${files.length} · ${file.basename} · ${progress.message}`
                );
              }
            );
            succeeded += 1;
          } catch (error) {
            const normalized = toGenerationError(error);
            failures.push(
              `${file.path} (${templateId}) [${normalized.code}]：${normalized.message}`
            );
          }
        }
      }
    } finally {
      notice.hide();
      this.isGenerating = false;
    }

    const total = files.length * options.templateIds.length;
    new Notice(
      failures.length
        ? `批量完成：${succeeded}/${total} 成功，${failures.length} 失败\n${failures
            .slice(0, 3)
            .join("\n")}`
        : `批量完成：${succeeded}/${total} 个输出全部成功`,
      failures.length ? 12000 : 8000
    );
  }

  private matchesTag(file: TFile, tag: string): boolean {
    if (!tag) {
      return true;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const tags = cache ? getAllTags(cache) ?? [] : [];
    return matchesNormalizedTag(tags, tag);
  }

  private async handleProtocol(
    params: Record<string, string>
  ): Promise<void> {
    if (params.folder !== undefined) {
      const templateIds = parseTemplateIds(
        params.templates || params.template || ""
      );
      await this.runBatch({
        folder: params.folder,
        tag: (params.tag || "").replace(/^#/, ""),
        templateIds:
          templateIds.length > 0
            ? templateIds
            : [this.settings.templateId],
        updateExisting: params.update !== "false"
      });
      return;
    }

    const path = params.file;
    const file = path
      ? this.app.vault.getAbstractFileByPath(path)
      : null;

    if (file instanceof TFile && file.extension === "md") {
      if (params.run === "true") {
        const templateId = isTemplateId(params.template)
          ? params.template
          : this.settings.templateId;
        await this.runFilesDirectly(
          [file],
          [templateId],
          params.update === "true"
        );
      } else {
        await this.previewFromFile(file);
      }
      return;
    }

    this.makeForActiveNote();
  }

  private async runFilesDirectly(
    files: TFile[],
    templateIds: TemplateId[],
    updateExisting: boolean
  ): Promise<void> {
    await this.runBatch(
      {
        folder: "",
        tag: "",
        templateIds,
        updateExisting
      },
      files
    );
  }

  private openPreview(
    markdown: string,
    file: TFile,
    context: GenerationContext,
    initialOptions?: CardGenerationOptions
  ): void {
    if (this.isGenerating) {
      new Notice("已有生成任务正在进行");
      return;
    }

    const frontmatter =
      this.app.metadataCache.getFileCache(file)?.frontmatter;
    const resolved = applyFrontmatterSettings(
      this.settings,
      frontmatter
    );

    new GenerateCardsModal(
      this.app,
      resolved.settings,
      resolved.coverTitle ?? file.basename,
      async (options) => {
        await this.generate(
          markdown,
          file,
          options,
          context,
          !resolved.hasOverrides
        );
      },
      initialOptions
    ).open();
  }

  private async generateDirectly(
    markdown: string,
    file: TFile,
    context: GenerationContext
  ): Promise<void> {
    if (this.isGenerating) {
      new Notice("已有生成任务正在进行");
      return;
    }

    const frontmatter =
      this.app.metadataCache.getFileCache(file)?.frontmatter;
    const resolved = applyFrontmatterSettings(
      this.settings,
      frontmatter
    );
    const options: CardGenerationOptions = {
      ...resolved.settings,
      coverTitle: resolved.coverTitle ?? file.basename
    };
    const notice = new Notice("正在生成卡片……", 0);
    this.isGenerating = true;

    try {
      const result = await this.generator.generate(
        markdown,
        file,
        options,
        (progress) => notice.setMessage(progress.message)
      );
      await this.completeGeneration(
        result,
        file,
        options,
        context
      );
    } catch (error) {
      console.error("[Text to Card] Generation failed", error);
      new Notice(formatGenerationError(error), 12000);
    } finally {
      notice.hide();
      this.isGenerating = false;
    }
  }

  private async generate(
    markdown: string,
    file: TFile,
    options: CardGenerationOptions,
    context: GenerationContext,
    persistSettings: boolean
  ): Promise<void> {
    this.isGenerating = true;

    if (persistSettings) {
      this.settings = {
        ...this.settings,
        templateId: options.templateId,
        templateSelection: options.templateSelection,
        exportFormat: options.exportFormat,
        pageRatio: options.pageRatio,
        outputFolder: options.outputFolder,
        includeCover: options.includeCover,
        coverImagePath: options.coverImagePath,
        signatureText: options.signatureText,
        useFileNameAsTitle: options.useFileNameAsTitle,
        stripFrontmatter: options.stripFrontmatter,
        fontSize: options.fontSize,
        lineHeight: options.lineHeight,
        letterSpacing: options.letterSpacing,
        textPadding: options.textPadding,
        bgColor: options.bgColor,
        textColor: options.textColor,
        accentColor: options.accentColor,
        watermarkText: options.watermarkText,
        showPageNumber: options.showPageNumber,
        insertLinksAfterGenerate:
          options.insertLinksAfterGenerate,
        copyFirstImageAfterGenerate:
          options.copyFirstImageAfterGenerate,
        revealOutputAfterGenerate:
          options.revealOutputAfterGenerate,
        maxPages: options.maxPages,
        fontFamily: options.fontFamily,
        logoPath: options.logoPath,
        brandPresetId: options.brandPresetId,
        updateExisting: options.updateExisting,
        outputNameSuffix: options.outputNameSuffix,
        qualityCheck: options.qualityCheck,
        shareAfterGenerate: options.shareAfterGenerate
      };
    }

    const notice = new Notice(
      "正在准备卡片预览……",
      0
    );

    try {
      if (persistSettings) {
        await this.saveSettings();
      }
      const session = await this.generator.prepare(
        markdown,
        file,
        options
      );
      notice.hide();

      new PageEditorModal(
        this.app,
        this.generator,
        session,
        options.maxPages,
        async (editedSession) => {
          await this.exportSession(
            editedSession,
            file,
            options,
            context
          );
        },
        () => {
          this.isGenerating = false;
          this.openPreview(
            markdown,
            file,
            context,
            options
          );
        },
        () => {
          this.isGenerating = false;
        }
      ).open();
    } catch (error) {
      console.error(
        "[Text to Card] Preview preparation failed",
        error
      );
      notice.hide();
      new Notice(
        formatGenerationError(error).replace("生成失败", "预览失败"),
        12000
      );
      this.isGenerating = false;
    }
  }

  private async exportSession(
    session: CardGenerationSession,
    file: TFile,
    options: CardGenerationOptions,
    context: GenerationContext
  ): Promise<void> {
    const notice = new Notice(
      "正在导出小红书卡片……",
      0
    );

    try {
      const result = await this.generator.save(
        session,
        file,
        options,
        (progress) => notice.setMessage(progress.message)
      );
      await this.completeGeneration(
        result,
        file,
        options,
        context
      );
    } catch (error) {
      console.error("[Text to Card] Generation failed", error);
      notice.hide();
      new Notice(formatGenerationError(error), 12000);
    } finally {
      notice.hide();
      this.isGenerating = false;
    }
  }

  private async completeGeneration(
    result: CardGenerationResult,
    file: TFile,
    options: CardGenerationOptions,
    context: GenerationContext
  ): Promise<void> {
    const completedActions: string[] = [];

    this.settings.lastGeneration = {
      sourcePath: file.path,
      files: result.files,
      outputFolder: result.outputFolder,
      generatedAt: new Date().toISOString(),
      pageCount: result.files.length,
      templateId: options.templateId,
      pageRatio: options.pageRatio
    };
    await this.saveSettings();

    if (options.insertLinksAfterGenerate) {
      if (context.editor && context.insertionPosition) {
        insertGeneratedImageLinks(
          context.editor,
          context.insertionPosition,
          result.files
        );
      } else {
        await appendGeneratedImageLinks(
          this.app,
          file,
          result.files
        );
      }
      completedActions.push("已插入图片链接");
    }

    if (
      options.copyFirstImageAfterGenerate &&
      result.files[0]
    ) {
      try {
        await copyVaultImageToClipboard(
          this.app,
          result.files[0]
        );
        completedActions.push("首图已复制");
      } catch (error) {
        console.warn(
          "[Text to Card] Copy image failed",
          error
        );
        new Notice(
          `图片已生成，但复制首图失败：${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
          8000
        );
      }
    }

    if (
      options.revealOutputAfterGenerate &&
      result.files[0]
    ) {
      try {
        const revealResult = await revealGeneratedFile(
          this.app,
          result.files[0]
        );
        completedActions.push(
          revealResult === "revealed"
            ? "已定位生成结果"
            : "已打开首图"
        );
      } catch (error) {
        console.warn(
          "[Text to Card] Reveal output failed",
          error
        );
      }
    }

    if (options.shareAfterGenerate && result.files.length > 0) {
      try {
        await shareGeneratedFiles(
          this.app,
          result.files,
          file.basename
        );
        completedActions.push("已打开系统分享");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          new Notice(
            `图片已生成，但系统分享失败：${
              error instanceof Error ? error.message : String(error)
            }`,
            8000
          );
        }
      }
    }

    if (options.qualityCheck) {
      completedActions.push(
        result.quality.passed
          ? "质量检查通过"
          : `质量检查：${result.quality.issues.length} 个警告`
      );
    }

    new Notice(
      [
        `生成完成：${result.files.length} 张图片`,
        result.outputFolder,
        completedActions.join("，"),
        ...result.quality.issues
          .slice(0, 2)
          .map((issue) => `⚠ ${issue.message}`)
      ]
        .filter(Boolean)
        .join("\n"),
      result.quality.issues.length > 0 ? 12000 : 8000
    );
  }
}

interface GenerationContext {
  editor?: Editor;
  insertionPosition?: EditorPosition;
}

function getDocumentEnd(editor: Editor): EditorPosition {
  const line = editor.lastLine();

  return {
    line,
    ch: editor.getLine(line).length
  };
}

function isTemplateId(
  value: unknown
): value is TemplateId {
  return typeof value === "string" &&
    TEMPLATE_IDS.includes(value as TemplateId);
}
