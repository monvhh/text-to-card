import {
  Modal,
  Notice,
  Setting,
  type App,
  type TextComponent
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
import { SHOW_CUSTOM_TEMPLATES } from "../feature-flags";
import {
  getPageRatioLabel,
  PAGE_RATIOS,
  type PageRatio
} from "../utils/page-ratio";
import {
  CUSTOM_FONT_PRESET_ID,
  findFontPresetByValue,
  FONT_PRESETS
} from "../utils/font-presets";
import { ImageFileSuggestModal } from "./image-file-suggest-modal";

export class GenerateCardsModal extends Modal {
  private values: CardGenerationOptions;
  private readonly brandPresets: BrandPreset[];
  private readonly customTemplates: CustomTemplate[];

  constructor(
    app: App,
    settings: XhsTextCardSettings,
    coverTitle: string,
    private readonly onGenerate: (
      options: CardGenerationOptions
    ) => Promise<void>,
    initialOptions?: CardGenerationOptions
  ) {
    super(app);
    this.values = {
      ...settings,
      coverTitle,
      ...(initialOptions ?? {})
    };
    this.brandPresets = settings.brandPresets;
    this.customTemplates = settings.customTemplates;

    if (!this.values.templateSelection) {
      this.values.templateSelection = this.values.templateId;
    }
  }

  onOpen(): void {
    this.modalEl.addClass("xhs-text-card-modal");
    this.titleEl.setText("Preview cards");
    this.renderContent();
  }

  private renderContent(): void {
    this.contentEl.empty();

    new Setting(this.contentEl)
      .setName("模板")
      .setDesc("选择卡片视觉样式")
      .addDropdown((dropdown) => {
        for (const templateId of TEMPLATE_IDS) {
          dropdown.addOption(
            templateId,
            getTemplateName(templateId)
          );
        }

        if (SHOW_CUSTOM_TEMPLATES) {
          for (const custom of this.customTemplates) {
            dropdown.addOption(
              `custom:${custom.id}`,
              `自定义 · ${custom.name}`
            );
          }
        }

        dropdown
          .setValue(
            SHOW_CUSTOM_TEMPLATES
              ? this.values.templateSelection
              : this.values.templateId
          )
          .onChange((value) => {
            this.values.templateSelection = value;
            const custom = SHOW_CUSTOM_TEMPLATES
              ? this.customTemplates.find(
                  (item) => `custom:${item.id}` === value
                )
              : undefined;
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

    this.renderDefaultSettings();

    const actionSetting = new Setting(this.contentEl);
    actionSetting.settingEl.addClass("xhs-text-card-actions");

    actionSetting.addButton((button) => {
        button
          .setButtonText("应用设置并刷新预览")
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

  private renderDefaultSettings(): void {
    const details = this.contentEl.createEl("details", {
      cls: "xhs-default-settings"
    });
    details.open = false;

    details.createEl("summary", {
      text: "默认设置（展开修改）"
    });
    details.createEl("p", {
      text: "修改后用于本次预览和保存；没有 YAML 覆盖时，也会保存为后续默认值。",
      cls: "setting-item-description"
    });

    const template = getTemplate(this.values.templateId);
    const fixedBackground =
      typeof template.config.bgColor === "string"
        ? template.config.bgColor
        : "#ffffff";
    new Setting(details)
      .setName("页面比例")
      .setDesc("切换后重新分页")
      .addDropdown((dropdown) => {
        for (const ratio of PAGE_RATIOS) {
          dropdown.addOption(ratio, getPageRatioLabel(ratio));
        }
        dropdown
          .setValue(this.values.pageRatio)
          .onChange((value) => {
            this.values.pageRatio = value as PageRatio;
          });
      });

    new Setting(details)
      .setName("图片格式")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("png", "PNG")
          .addOption("jpeg", "JPEG")
          .setValue(this.values.exportFormat)
          .onChange((value) => {
            this.values.exportFormat = value as ExportFormat;
          });
      });

    new Setting(details)
      .setName("输出目录")
      .addText((text) => {
        text
          .setValue(this.values.outputFolder)
          .onChange((value) => {
            this.values.outputFolder = value.trim();
          });
      });

    new Setting(details)
      .setName("输出名称后缀")
      .setDesc("留空不添加")
      .addText((text) => {
        text
          .setValue(this.values.outputNameSuffix)
          .onChange((value) => {
            this.values.outputNameSuffix = value.trim();
          });
      });

    addToggleSetting(
      details,
      "更新固定输出",
      "覆盖同名图片并清理多余旧页",
      this.values.updateExisting,
      (value) => {
        this.values.updateExisting = value;
      }
    );

    let coverImageText: TextComponent | undefined;
    new Setting(details)
      .setName("封面图片")
      .setDesc("从 Vault 选择；留空使用模板封面")
      .addText((text) => {
        coverImageText = text;
        text
          .setValue(this.values.coverImagePath)
          .onChange((value) => {
            this.values.coverImagePath = value.trim();
          });
      })
      .addButton((button) => {
        button.setButtonText("选择").onClick(() => {
          new ImageFileSuggestModal(this.app, (file) => {
            this.values.coverImagePath = file.path;
            coverImageText?.setValue(file.path);
          }).open();
        });
      })
      .addExtraButton((button) => {
        button
          .setIcon("x")
          .setTooltip("清除")
          .onClick(() => {
            this.values.coverImagePath = "";
            coverImageText?.setValue("");
          });
      });

    addNumberSetting(
      details,
      "正文字号",
      this.values.fontSize,
      13,
      24,
      1,
      (value) => {
        this.values.fontSize = value;
      }
    );
    addNumberSetting(
      details,
      "行高",
      this.values.lineHeight,
      1.2,
      2.4,
      0.1,
      (value) => {
        this.values.lineHeight = value;
      }
    );
    addNumberSetting(
      details,
      "字间距",
      this.values.letterSpacing,
      0,
      2,
      0.1,
      (value) => {
        this.values.letterSpacing = value;
      }
    );
    addNumberSetting(
      details,
      "内容边距",
      this.values.textPadding,
      24,
      72,
      1,
      (value) => {
        this.values.textPadding = value;
      }
    );

    new Setting(details)
      .setName("背景色")
      .setDesc(`${fixedBackground}（由模板固定）`);

    new Setting(details)
      .setName("文字色")
      .addColorPicker((picker) => {
        picker
          .setValue(this.values.textColor)
          .onChange((value) => {
            this.values.textColor = value;
          });
      });

    new Setting(details)
      .setName("强调色")
      .addColorPicker((picker) => {
        picker
          .setValue(this.values.accentColor)
          .onChange((value) => {
            this.values.accentColor = value;
          });
      });

    let fontFamilyText: TextComponent | undefined;
    new Setting(details)
      .setName("字体")
      .addDropdown((dropdown) => {
        for (const preset of FONT_PRESETS) {
          dropdown.addOption(preset.id, preset.name);
        }
        dropdown.addOption(
          CUSTOM_FONT_PRESET_ID,
          "自定义字体"
        );
        dropdown
          .setValue(
            findFontPresetByValue(this.values.fontFamily)?.id ??
              CUSTOM_FONT_PRESET_ID
          )
          .onChange((value) => {
            const preset = FONT_PRESETS.find(
              (item) => item.id === value
            );
            if (preset) {
              this.values.fontFamily = preset.value;
              fontFamilyText?.setValue(preset.value);
            }
          });
      })
      .addText((text) => {
        fontFamilyText = text;
        text
          .setValue(this.values.fontFamily)
          .onChange((value) => {
            this.values.fontFamily =
              value.trim() || "inherit";
          });
      });

    let logoPathText: TextComponent | undefined;
    new Setting(details)
      .setName("Logo")
      .setDesc("从 Vault 选择")
      .addText((text) => {
        logoPathText = text;
        text
          .setValue(this.values.logoPath)
          .onChange((value) => {
            this.values.logoPath = value.trim();
          });
      })
      .addButton((button) => {
        button.setButtonText("选择").onClick(() => {
          new ImageFileSuggestModal(this.app, (file) => {
            this.values.logoPath = file.path;
            logoPathText?.setValue(file.path);
          }).open();
        });
      })
      .addExtraButton((button) => {
        button
          .setIcon("x")
          .setTooltip("清除")
          .onClick(() => {
            this.values.logoPath = "";
            logoPathText?.setValue("");
          });
      });

    new Setting(details)
      .setName("品牌签名")
      .addText((text) => {
        text
          .setValue(this.values.signatureText)
          .onChange((value) => {
            this.values.signatureText = value;
          });
      });

    new Setting(details)
      .setName("品牌水印")
      .addText((text) => {
        text
          .setValue(this.values.watermarkText)
          .onChange((value) => {
            this.values.watermarkText = value;
          });
      });

    addToggleSetting(
      details,
      "显示页码",
      "",
      this.values.showPageNumber,
      (value) => {
        this.values.showPageNumber = value;
      }
    );
    addNumberSetting(
      details,
      "最大页数",
      this.values.maxPages,
      0,
      50,
      1,
      (value) => {
        this.values.maxPages = value;
      },
      "0 表示不限制"
    );
    addToggleSetting(
      details,
      "移除 YAML 属性",
      "",
      this.values.stripFrontmatter,
      (value) => {
        this.values.stripFrontmatter = value;
      }
    );
    addToggleSetting(
      details,
      "将 Obsidian 文章标题加入图片",
      "关闭后仅按文档原内容生成",
      this.values.useFileNameAsTitle,
      (value) => {
        this.values.useFileNameAsTitle = value;
      }
    );
    addToggleSetting(
      details,
      "插入图片链接",
      "",
      this.values.insertLinksAfterGenerate,
      (value) => {
        this.values.insertLinksAfterGenerate = value;
      }
    );
    addToggleSetting(
      details,
      "复制首张图片",
      "",
      this.values.copyFirstImageAfterGenerate,
      (value) => {
        this.values.copyFirstImageAfterGenerate = value;
      }
    );
    addToggleSetting(
      details,
      "定位生成结果",
      "",
      this.values.revealOutputAfterGenerate,
      (value) => {
        this.values.revealOutputAfterGenerate = value;
      }
    );
    addToggleSetting(
      details,
      "质量检查",
      "检查输出尺寸、空文件和加载失败的图片",
      this.values.qualityCheck,
      (value) => {
        this.values.qualityCheck = value;
      }
    );
    addToggleSetting(
      details,
      "生成后系统分享",
      "主要用于移动设备",
      this.values.shareAfterGenerate,
      (value) => {
        this.values.shareAfterGenerate = value;
      }
    );
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

function addToggleSetting(
  container: HTMLElement,
  name: string,
  description: string,
  value: boolean,
  onChange: (value: boolean) => void
): void {
  const setting = new Setting(container).setName(name);

  if (description) {
    setting.setDesc(description);
  }

  setting.addToggle((toggle) => {
    toggle.setValue(value).onChange(onChange);
  });
}

function addNumberSetting(
  container: HTMLElement,
  name: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (value: number) => void,
  description = `${min}–${max}`
): void {
  new Setting(container)
    .setName(name)
    .setDesc(description)
    .addText((text) => {
      text.inputEl.type = "number";
      text.inputEl.min = String(min);
      text.inputEl.max = String(max);
      text.inputEl.step = String(step);
      text.setValue(String(value)).onChange((raw) => {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          onChange(Math.min(max, Math.max(min, parsed)));
        }
      });
    });
}
