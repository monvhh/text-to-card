import {
  Modal,
  Notice,
  Setting,
  type App
} from "obsidian";
import type {
  BrandPreset,
  CustomTemplate,
  ExportFormat,
  XhsTextCardSettings
} from "../settings";
import {
  getTemplate,
  getTemplateName,
  TEMPLATE_IDS,
  type TemplateId
} from "../templates";
import type { CardGenerationOptions } from "../services/card-generator";

export class GenerateCardsModal extends Modal {
  private values: CardGenerationOptions;
  private readonly brandPresets: BrandPreset[];
  private readonly customTemplates: CustomTemplate[];
  private readonly favoriteTemplateIds: string[];
  private readonly recentTemplateIds: string[];

  constructor(
    app: App,
    settings: XhsTextCardSettings,
    coverTitle: string,
    private readonly onGenerate: (
      options: CardGenerationOptions
    ) => Promise<void>
  ) {
    super(app);
    this.values = {
      ...settings,
      coverTitle
    };
    this.brandPresets = settings.brandPresets;
    this.customTemplates = settings.customTemplates;
    this.favoriteTemplateIds = settings.favoriteTemplateIds;
    this.recentTemplateIds = settings.recentTemplateIds;

    if (!this.values.templateSelection) {
      this.values.templateSelection = this.values.templateId;
    }
  }

  onOpen(): void {
    this.modalEl.addClass("xhs-text-card-modal");
    this.titleEl.setText("生成小红书卡片");
    this.renderContent();
  }

  private renderContent(): void {
    this.contentEl.empty();

    new Setting(this.contentEl)
      .setName("模板")
      .setDesc("选择卡片视觉样式")
      .addDropdown((dropdown) => {
        for (const templateId of this.orderedTemplateIds()) {
          const favorite =
            this.favoriteTemplateIds.includes(templateId);
          const recent =
            this.recentTemplateIds.includes(templateId);
          dropdown.addOption(
            templateId,
            `${favorite ? "★ " : recent ? "最近 · " : ""}${getTemplateName(templateId)}`
          );
        }

        for (const custom of this.customTemplates) {
          dropdown.addOption(
            `custom:${custom.id}`,
            `自定义 · ${custom.name}`
          );
        }

        dropdown
          .setValue(this.values.templateSelection)
          .onChange((value) => {
            this.values.templateSelection = value;
            const custom = this.customTemplates.find(
              (item) => `custom:${item.id}` === value
            );
            const templateId = custom
              ? custom.baseTemplateId
              : (value as TemplateId);
            this.values.templateId = templateId;
            this.applyTemplateDefaults(templateId, custom);
            this.renderContent();
          });
      });

    new Setting(this.contentEl)
      .setName("品牌预设")
      .setDesc("快速应用品牌色、签名、字体和 Logo")
      .addDropdown((dropdown) => {
        dropdown.addOption("", "不使用预设");

        for (const preset of this.brandPresets) {
          dropdown.addOption(preset.id, preset.name);
        }

        dropdown
          .setValue(this.values.brandPresetId)
          .onChange((value) => {
            this.values.brandPresetId = value;
            const preset = this.brandPresets.find(
              (item) => item.id === value
            );

            if (preset) {
              this.applyBrandPreset(preset);
              this.renderContent();
            }
          });
      });

    new Setting(this.contentEl)
      .setName("图片格式")
      .setDesc("PNG 无损；JPEG 文件更小")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("png", "PNG")
          .addOption("jpeg", "JPEG")
          .setValue(this.values.exportFormat)
          .onChange((value) => {
            this.values.exportFormat =
              value as ExportFormat;
          });
      });

    new Setting(this.contentEl)
      .setName("生成封面")
      .setDesc("在正文卡片前增加一张封面")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.includeCover)
          .onChange((value) => {
            this.values.includeCover = value;
          });
      });

    new Setting(this.contentEl)
      .setName("封面标题")
      .addText((text) => {
        text
          .setPlaceholder("默认使用笔记标题")
          .setValue(this.values.coverTitle)
          .onChange((value) => {
            this.values.coverTitle = value;
          });
      });

    new Setting(this.contentEl)
      .setName("自定义封面图片")
      .setDesc("填写 Vault 内图片路径；留空使用模板封面")
      .addText((text) => {
        text
          .setPlaceholder("Assets/cover.jpg")
          .setValue(this.values.coverImagePath)
          .onChange((value) => {
            this.values.coverImagePath = value.trim();
          });
      });

    new Setting(this.contentEl)
      .setName("签名")
      .setDesc("留空则不显示签名")
      .addText((text) => {
        text
          .setPlaceholder("例如：@你的账号")
          .setValue(this.values.signatureText)
          .onChange((value) => {
            this.values.signatureText = value;
          });
      });

    this.contentEl.createEl("h3", {
      text: "排版与颜色",
      cls: "xhs-text-card-section-title"
    });

    new Setting(this.contentEl)
      .setName("正文字号")
      .setDesc(`${this.values.fontSize}px`)
      .addSlider((slider) => {
        slider
          .setLimits(13, 24, 1)
          .setValue(this.values.fontSize)
          .onChange((value) => {
            this.values.fontSize = value;
          });
      });

    new Setting(this.contentEl)
      .setName("行高")
      .setDesc(this.values.lineHeight.toFixed(1))
      .addSlider((slider) => {
        slider
          .setLimits(1.2, 2.4, 0.1)
          .setValue(this.values.lineHeight)
          .onChange((value) => {
            this.values.lineHeight = value;
          });
      });

    new Setting(this.contentEl)
      .setName("字间距")
      .setDesc(`${this.values.letterSpacing.toFixed(1)}px`)
      .addSlider((slider) => {
        slider
          .setLimits(0, 2, 0.1)
          .setValue(this.values.letterSpacing)
          .onChange((value) => {
            this.values.letterSpacing = value;
          });
      });

    new Setting(this.contentEl)
      .setName("内容边距")
      .setDesc(`${this.values.textPadding}px`)
      .addSlider((slider) => {
        slider
          .setLimits(24, 72, 1)
          .setValue(this.values.textPadding)
          .onChange((value) => {
            this.values.textPadding = value;
          });
      });

    new Setting(this.contentEl)
      .setName("背景色")
      .addColorPicker((picker) => {
        picker
          .setValue(this.values.bgColor)
          .onChange((value) => {
            this.values.bgColor = value;
          });
      });

    new Setting(this.contentEl)
      .setName("文字色")
      .addColorPicker((picker) => {
        picker
          .setValue(this.values.textColor)
          .onChange((value) => {
            this.values.textColor = value;
          });
      });

    new Setting(this.contentEl)
      .setName("强调色")
      .addColorPicker((picker) => {
        picker
          .setValue(this.values.accentColor)
          .onChange((value) => {
            this.values.accentColor = value;
          });
      });

    new Setting(this.contentEl)
      .setName("字体")
      .setDesc("填写系统字体族，例如 PingFang SC")
      .addText((text) => {
        text
          .setPlaceholder("inherit")
          .setValue(this.values.fontFamily)
          .onChange((value) => {
            this.values.fontFamily = value.trim() || "inherit";
          });
      });

    new Setting(this.contentEl)
      .setName("Logo 路径")
      .setDesc("Vault 内图片路径，留空则隐藏")
      .addText((text) => {
        text
          .setPlaceholder("Assets/logo.png")
          .setValue(this.values.logoPath)
          .onChange((value) => {
            this.values.logoPath = value;
          });
      });

    new Setting(this.contentEl)
      .setName("水印文字")
      .setDesc("留空则不显示水印")
      .addText((text) => {
        text
          .setPlaceholder("例如：请勿搬运")
          .setValue(this.values.watermarkText)
          .onChange((value) => {
            this.values.watermarkText = value;
          });
      });

    new Setting(this.contentEl)
      .setName("显示页码")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.showPageNumber)
          .onChange((value) => {
            this.values.showPageNumber = value;
          });
      });

    new Setting(this.contentEl)
      .setName("最大页数")
      .setDesc("0 表示不限制；超过限制时停止导出")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.max = "50";
        text.inputEl.step = "1";
        text
          .setValue(String(this.values.maxPages))
          .onChange((value) => {
            this.values.maxPages = clampInteger(
              value,
              0,
              50
            );
          });
      });

    new Setting(this.contentEl)
      .setName("输出目录")
      .setDesc("每次生成会在该目录下创建独立文件夹")
      .addText((text) => {
        text
          .setPlaceholder("XHS-Cards")
          .setValue(this.values.outputFolder)
          .onChange((value) => {
            this.values.outputFolder = value;
          });
      });

    new Setting(this.contentEl)
      .setName("更新固定输出")
      .setDesc("使用稳定目录并覆盖同名图片，删除多余旧页")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.updateExisting)
          .onChange((value) => {
            this.values.updateExisting = value;
          });
      });

    new Setting(this.contentEl)
      .setName("移除 YAML 属性")
      .setDesc("生成时忽略笔记开头的 frontmatter")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.stripFrontmatter)
          .onChange((value) => {
            this.values.stripFrontmatter = value;
          });
      });

    new Setting(this.contentEl)
      .setName("使用文件名作为文章标题")
      .setDesc("在正文最前添加一级标题，不修改原笔记")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.useFileNameAsTitle)
          .onChange((value) => {
            this.values.useFileNameAsTitle = value;
          });
      });

    this.contentEl.createEl("h3", {
      text: "生成后操作",
      cls: "xhs-text-card-section-title"
    });

    new Setting(this.contentEl)
      .setName("插入图片链接")
      .setDesc("将生成的图片嵌入到当前笔记")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.insertLinksAfterGenerate)
          .onChange((value) => {
            this.values.insertLinksAfterGenerate = value;
          });
      });

    new Setting(this.contentEl)
      .setName("复制首张图片")
      .setDesc("生成后将第一张图片复制到系统剪贴板")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.copyFirstImageAfterGenerate)
          .onChange((value) => {
            this.values.copyFirstImageAfterGenerate = value;
          });
      });

    new Setting(this.contentEl)
      .setName("定位生成结果")
      .setDesc("在文件管理器中定位首图，必要时直接打开")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.revealOutputAfterGenerate)
          .onChange((value) => {
            this.values.revealOutputAfterGenerate = value;
          });
      });

    const actionSetting = new Setting(this.contentEl);
    actionSetting.settingEl.addClass("xhs-text-card-actions");

    actionSetting
      .addButton((button) => {
        button
          .setButtonText("取消")
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setButtonText("生成图片")
          .setCta()
          .onClick(() => {
            if (!this.values.outputFolder.trim()) {
              new Notice("请填写输出目录");
              return;
            }

            const options = { ...this.values };
            this.close();
            void this.onGenerate(options);
          });
      });
  }

  private applyTemplateDefaults(
    templateId: TemplateId,
    custom?: CustomTemplate
  ): void {
    const config: Record<string, unknown> = {
      ...getTemplate(templateId).config,
      ...(custom ?? {})
    };

    this.values.fontSize = readNumber(config.fontSize, 17);
    this.values.lineHeight = readNumber(config.lineHeight, 1.8);
    this.values.letterSpacing = readNumber(
      config.letterSpacing,
      0.5
    );
    this.values.textPadding = readNumber(config.textPadding, 40);
    this.values.bgColor = readColor(config.bgColor, "#ffffff");
    this.values.textColor = readColor(
      config.textColor,
      "#222222"
    );
    this.values.accentColor = readColor(
      config.accentColor,
      "#f44830"
    );
    this.values.watermarkText = "";
    this.values.showPageNumber =
      config.showPageNumber !== false;
    this.values.fontFamily =
      typeof config.fontFamily === "string"
        ? config.fontFamily
        : "inherit";
  }

  private applyBrandPreset(preset: BrandPreset): void {
    this.values.signatureText = preset.signatureText;
    this.values.watermarkText = preset.watermarkText;
    this.values.bgColor = preset.bgColor;
    this.values.textColor = preset.textColor;
    this.values.accentColor = preset.accentColor;
    this.values.fontFamily = preset.fontFamily;
    this.values.logoPath = preset.logoPath;
  }

  private orderedTemplateIds(): TemplateId[] {
    const rank = (id: string) => {
      if (this.favoriteTemplateIds.includes(id)) {
        return 0;
      }

      const recentIndex = this.recentTemplateIds.indexOf(id);
      return recentIndex >= 0 ? 1 + recentIndex : 20;
    };

    return [...TEMPLATE_IDS].sort(
      (a, b) => rank(a) - rank(b)
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readColor(value: unknown, fallback: string): string {
  return typeof value === "string" &&
    /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}

function clampInteger(
  value: string,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}
