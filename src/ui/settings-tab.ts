import {
  Notice,
  PluginSettingTab,
  SecretComponent,
  Setting,
  type App,
  type SettingDefinitionItem,
  type TextComponent
} from "obsidian";
import type XhsTextCardPlugin from "../main";
import type {
  ExportFormat
} from "../settings";
import {
  getTemplate,
  getTemplateName,
  TEMPLATE_IDS,
  type TemplateId
} from "../templates";
import {
  applyCustomTemplate,
  createCustomTemplate,
  mergeCustomTemplates,
  parseCustomTemplates
} from "../utils/custom-templates";
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
import { SHOW_CUSTOM_TEMPLATES } from "../feature-flags";

export class XhsTextCardSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: XhsTextCardPlugin
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Text to Card 设置",
        aliases: [
          "默认模板",
          "图片格式",
          "页面比例",
          "输出目录",
          "封面",
          "签名",
          "水印",
          "字体",
          "Logo",
          "页码",
          "文件名标题",
          "品牌预设",
          "质量检查",
          "系统分享",
          "上次生成",
          "导入预设",
          "导出预设",
          "微信公众号",
          "多平台发布",
          "Webhook",
          "AppSecret"
        ],
        render: (setting) => {
          setting.settingEl.empty();
          this.renderAll(setting.settingEl);
        }
      }
    ];
  }

  display(): void {
    this.renderAll(this.containerEl);
  }

  private renderAll(containerEl: HTMLElement): void {
    containerEl.empty();

    new Setting(containerEl)
      .setName("默认生成设置")
      .setHeading();

    new Setting(containerEl)
      .setName("默认模板")
      .addDropdown((dropdown) => {
        for (const templateId of TEMPLATE_IDS) {
          dropdown.addOption(
            templateId,
            getTemplateName(templateId)
          );
        }

        if (SHOW_CUSTOM_TEMPLATES) {
          for (const custom of this.plugin.settings.customTemplates) {
            dropdown.addOption(
              `custom:${custom.id}`,
              `自定义 · ${custom.name}`
            );
          }
        }

        dropdown
          .setValue(
            SHOW_CUSTOM_TEMPLATES
              ? this.plugin.settings.templateSelection
              : this.plugin.settings.templateId
          )
          .onChange(async (value) => {
            this.plugin.settings.templateSelection = value;
            const custom =
              SHOW_CUSTOM_TEMPLATES
                ? this.plugin.settings.customTemplates.find(
                    (item) => `custom:${item.id}` === value
                  )
                : undefined;
            this.plugin.settings.templateId = custom
              ? custom.baseTemplateId
              : (value as TemplateId);

            if (custom) {
              applyCustomTemplate(
                this.plugin.settings,
                custom
              );
            } else {
              applyBuiltInTemplate(
                this.plugin.settings,
                this.plugin.settings.templateId
              );
            }
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认图片格式")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("png", "PNG")
          .addOption("jpeg", "JPEG")
          .setValue(this.plugin.settings.exportFormat)
          .onChange(async (value) => {
            this.plugin.settings.exportFormat =
              value as ExportFormat;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认页面比例")
      .setDesc("切换比例后会按新的画布高度重新分页")
      .addDropdown((dropdown) => {
        for (const ratio of PAGE_RATIOS) {
          dropdown.addOption(
            ratio,
            getPageRatioLabel(ratio)
          );
        }

        dropdown
          .setValue(this.plugin.settings.pageRatio)
          .onChange(async (value) => {
            this.plugin.settings.pageRatio =
              value as PageRatio;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认输出目录")
      .addText((text) => {
        text
          .setPlaceholder("XHS-Cards")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认更新固定输出")
      .setDesc("覆盖同名图片并移除多余旧页")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.updateExisting)
          .onChange(async (value) => {
            this.plugin.settings.updateExisting = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认生成封面")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeCover)
          .onChange(async (value) => {
            this.plugin.settings.includeCover = value;
            await this.plugin.saveSettings();
          });
      });

    let coverImageText: TextComponent | undefined;
    new Setting(containerEl)
      .setName("默认封面图片路径")
      .setDesc("从 Vault 选择图片；留空使用模板封面")
      .addText((text) => {
        coverImageText = text;
        text
          .setPlaceholder("Assets/cover.jpg")
          .setValue(this.plugin.settings.coverImagePath)
          .onChange(async (value) => {
            this.plugin.settings.coverImagePath = value.trim();
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) => {
        button
          .setButtonText("选择图片")
          .onClick(() => {
            new ImageFileSuggestModal(
              this.app,
              (file) => {
                this.plugin.settings.coverImagePath =
                  file.path;
                coverImageText?.setValue(file.path);
                void this.plugin.saveSettings();
              }
            ).open();
          });
      })
      .addExtraButton((button) => {
        button
          .setIcon("x")
          .setTooltip("清除封面图片")
          .onClick(async () => {
            this.plugin.settings.coverImagePath = "";
            coverImageText?.setValue("");
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("将 Obsidian 文章标题加入图片")
      .setDesc(
        "开启：把当前文件名作为一级标题加入生成内容；关闭：仅生成文档原内容。不会修改原笔记"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useFileNameAsTitle)
          .onChange(async (value) => {
            this.plugin.settings.useFileNameAsTitle = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认排版与颜色")
      .setHeading();

    new Setting(containerEl)
      .setName("默认正文字号")
      .setDesc(`${this.plugin.settings.fontSize}px`)
      .addSlider((slider) => {
        slider
          .setLimits(13, 24, 1)
          .setValue(this.plugin.settings.fontSize)
          .onChange(async (value) => {
            this.plugin.settings.fontSize = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认行高")
      .setDesc(this.plugin.settings.lineHeight.toFixed(1))
      .addSlider((slider) => {
        slider
          .setLimits(1.2, 2.4, 0.1)
          .setValue(this.plugin.settings.lineHeight)
          .onChange(async (value) => {
            this.plugin.settings.lineHeight = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认字间距")
      .setDesc(`${this.plugin.settings.letterSpacing.toFixed(1)}px`)
      .addSlider((slider) => {
        slider
          .setLimits(0, 2, 0.1)
          .setValue(this.plugin.settings.letterSpacing)
          .onChange(async (value) => {
            this.plugin.settings.letterSpacing = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认内容边距")
      .setDesc(`${this.plugin.settings.textPadding}px`)
      .addSlider((slider) => {
        slider
          .setLimits(24, 72, 1)
          .setValue(this.plugin.settings.textPadding)
          .onChange(async (value) => {
            this.plugin.settings.textPadding = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认背景色")
      .setDesc(
        `由当前模板固定：${getFixedTemplateBackground(
          this.plugin.settings.templateId
        )}，不跟随 Obsidian 主题`
      );

    new Setting(containerEl)
      .setName("默认文字色")
      .addColorPicker((picker) => {
        picker
          .setValue(this.plugin.settings.textColor)
          .onChange(async (value) => {
            this.plugin.settings.textColor = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认强调色")
      .addColorPicker((picker) => {
        picker
          .setValue(this.plugin.settings.accentColor)
          .onChange(async (value) => {
            this.plugin.settings.accentColor = value;
            await this.plugin.saveSettings();
          });
      });

    let fontFamilyText: TextComponent | undefined;
    const fontSetting = new Setting(containerEl)
      .setName("默认字体")
      .setDesc("选择预设字体，或在右侧输入自定义字体族");

    fontSetting.addDropdown((dropdown) => {
      for (const preset of FONT_PRESETS) {
        dropdown.addOption(preset.id, preset.name);
      }
      dropdown.addOption(
        CUSTOM_FONT_PRESET_ID,
        "自定义字体"
      );
      dropdown
        .setValue(
          findFontPresetByValue(
            this.plugin.settings.fontFamily
          )?.id ?? CUSTOM_FONT_PRESET_ID
        )
        .onChange(async (value) => {
          const preset = FONT_PRESETS.find(
            (item) => item.id === value
          );

          if (!preset) {
            return;
          }

          this.plugin.settings.fontFamily = preset.value;
          fontFamilyText?.setValue(preset.value);
          await this.plugin.saveSettings();
        });
    });

    fontSetting.addText((text) => {
      fontFamilyText = text;
      text
        .setPlaceholder("例如：PingFang SC, sans-serif")
        .setValue(this.plugin.settings.fontFamily)
        .onChange(async (value) => {
          this.plugin.settings.fontFamily =
            value.trim() || "inherit";
          await this.plugin.saveSettings();
        });
    });

    let logoPathText: TextComponent | undefined;
    new Setting(containerEl)
      .setName("默认 Logo 路径")
      .setDesc("从 Vault 选择 Logo 图片")
      .addText((text) => {
        logoPathText = text;
        text
          .setPlaceholder("Assets/logo.png")
          .setValue(this.plugin.settings.logoPath)
          .onChange(async (value) => {
            this.plugin.settings.logoPath = value.trim();
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) => {
        button
          .setButtonText("选择图片")
          .onClick(() => {
            new ImageFileSuggestModal(
              this.app,
              (file) => {
                this.plugin.settings.logoPath = file.path;
                logoPathText?.setValue(file.path);
                void this.plugin.saveSettings();
              }
            ).open();
          });
      })
      .addExtraButton((button) => {
        button
          .setIcon("x")
          .setTooltip("清除 Logo")
          .onClick(async () => {
            this.plugin.settings.logoPath = "";
            logoPathText?.setValue("");
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认显示页码")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showPageNumber)
          .onChange(async (value) => {
            this.plugin.settings.showPageNumber = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认最大页数")
      .setDesc("0 表示不限制，最大可设为 50")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.max = "50";
        text.inputEl.step = "1";
        text
          .setValue(String(this.plugin.settings.maxPages))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.maxPages = Number.isFinite(
              parsed
            )
              ? Math.min(50, Math.max(0, parsed))
              : 0;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("生成后默认插入图片链接")
      .setDesc("把生成结果嵌入到原笔记的选区末尾或笔记末尾")
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.insertLinksAfterGenerate
          )
          .onChange(async (value) => {
            this.plugin.settings.insertLinksAfterGenerate =
              value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("生成后默认复制首图")
      .setDesc("需要系统允许 Obsidian 访问剪贴板")
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.copyFirstImageAfterGenerate
          )
          .onChange(async (value) => {
            this.plugin.settings.copyFirstImageAfterGenerate =
              value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("生成后默认定位结果")
      .setDesc("优先在文件管理器中定位首图")
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.revealOutputAfterGenerate
          )
          .onChange(async (value) => {
            this.plugin.settings.revealOutputAfterGenerate =
              value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认执行质量检查")
      .setDesc("检查导出尺寸、空文件和加载失败的图片")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.qualityCheck)
          .onChange(async (value) => {
            this.plugin.settings.qualityCheck = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("生成后打开系统分享")
      .setDesc("主要用于支持系统分享面板的移动设备")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.shareAfterGenerate)
          .onChange(async (value) => {
            this.plugin.settings.shareAfterGenerate = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("移除 YAML 属性")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.stripFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.stripFrontmatter = value;
            await this.plugin.saveSettings();
          });
      });

    this.renderPublishing(containerEl);
    this.renderLastGeneration(containerEl);

    this.renderBrandPresets(containerEl);
    if (SHOW_CUSTOM_TEMPLATES) {
      this.renderCustomTemplates(containerEl);
    }
  }

  private refreshSettings(): void {
    const update = Reflect.get(this, "update");

    if (typeof update === "function") {
      Reflect.apply(update, this, []);
    } else {
      this.renderAll(this.containerEl);
    }
  }

  private renderBrandPresets(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("品牌预设")
      .setHeading();

    new Setting(containerEl)
      .setName("预设导入与导出")
      .setDesc("导出为 Vault 根目录 JSON；导入时按 ID 合并，不删除已有预设")
      .addButton((button) => {
        button
          .setButtonText("导出预设")
          .onClick(() => void this.plugin.exportPresets());
      })
      .addButton((button) => {
        button
          .setButtonText("导入预设")
          .onClick(() => this.plugin.openImportPresets());
      });
    let presetName = "";

    new Setting(containerEl)
      .setName("品牌签名")
      .setDesc("应用于生成卡片；留空则不显示")
      .addText((text) => {
        text
          .setPlaceholder("@你的账号")
          .setValue(this.plugin.settings.signatureText)
          .onChange(async (value) => {
            this.plugin.settings.signatureText = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("品牌水印")
      .setDesc("应用于生成卡片；留空则不显示")
      .addText((text) => {
        text
          .setPlaceholder("请勿搬运")
          .setValue(this.plugin.settings.watermarkText)
          .onChange(async (value) => {
            this.plugin.settings.watermarkText = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("保存当前品牌设置")
      .setDesc("保存颜色、签名、水印、字体和 Logo")
      .addText((text) => {
        text
          .setPlaceholder("例如：Alice 的知识花园")
          .onChange((value) => {
            presetName = value.trim();
          });
      })
      .addButton((button) => {
        button.setButtonText("保存预设").onClick(async () => {
          if (!presetName) {
            new Notice("请填写品牌预设名称");
            return;
          }

          const id = createId("brand");
          this.plugin.settings.brandPresets.push({
            id,
            name: presetName,
            signatureText:
              this.plugin.settings.signatureText,
            watermarkText:
              this.plugin.settings.watermarkText,
            bgColor: this.plugin.settings.bgColor,
            textColor: this.plugin.settings.textColor,
            accentColor: this.plugin.settings.accentColor,
            fontFamily: this.plugin.settings.fontFamily,
            logoPath: this.plugin.settings.logoPath
          });
          this.plugin.settings.brandPresetId = id;
          await this.plugin.saveSettings();
          this.refreshSettings();
        });
      });

    for (const preset of this.plugin.settings.brandPresets) {
      new Setting(containerEl)
        .setName(preset.name)
        .setDesc(
          `${preset.signatureText || "无签名"} · ${preset.accentColor}`
        )
        .addButton((button) => {
          button.setButtonText("应用").onClick(async () => {
            Object.assign(this.plugin.settings, {
              brandPresetId: preset.id,
              signatureText: preset.signatureText,
              watermarkText: preset.watermarkText,
              bgColor: preset.bgColor,
              textColor: preset.textColor,
              accentColor: preset.accentColor,
              fontFamily: preset.fontFamily,
              logoPath: preset.logoPath
            });
            await this.plugin.saveSettings();
            this.refreshSettings();
          });
        })
        .addExtraButton((button) => {
          button
            .setIcon("trash")
            .setTooltip("删除预设")
            .onClick(async () => {
              this.plugin.settings.brandPresets =
                this.plugin.settings.brandPresets.filter(
                  (item) => item.id !== preset.id
                );
              if (
                this.plugin.settings.brandPresetId === preset.id
              ) {
                this.plugin.settings.brandPresetId = "";
              }
              await this.plugin.saveSettings();
              this.refreshSettings();
            });
        });
    }
  }

  private renderLastGeneration(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("上次生成")
      .setHeading();

    const record = this.plugin.settings.lastGeneration;
    new Setting(containerEl)
      .setName(record ? `${record.pageCount} 张图片` : "暂无记录")
      .setDesc(
        record
          ? `${record.sourcePath} · ${new Date(
              record.generatedAt
            ).toLocaleString()}`
          : "成功生成后会记录来源、输出目录和图片路径"
      )
      .addButton((button) => {
        button
          .setButtonText("打开")
          .setDisabled(!record)
          .onClick(() => void this.plugin.openLastGeneration());
      })
      .addButton((button) => {
        button
          .setButtonText("分享")
          .setDisabled(!record)
          .onClick(() => void this.plugin.shareLastGeneration());
      })
      .addExtraButton((button) => {
        button
          .setIcon("trash")
          .setTooltip("清除记录（不会删除图片）")
          .setDisabled(!record)
          .onClick(async () => {
            this.plugin.settings.lastGeneration = null;
            await this.plugin.saveSettings();
            this.refreshSettings();
          });
      });
  }

  private renderPublishing(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("平台草稿")
      .setHeading();

    new Setting(containerEl)
      .setName("微信公众号 AppID")
      .setDesc("需要公众号草稿与素材接口权限；插件仅在你点击保存草稿后联网")
      .addText((text) => {
        text
          .setPlaceholder("wx...")
          .setValue(this.plugin.settings.wechatAppId)
          .onChange(async (value) => {
            this.plugin.settings.wechatAppId = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("微信公众号 AppSecret")
      .setDesc("选择或创建 Obsidian SecretStorage 密钥；配置文件只保存密钥名称")
      .addComponent((element) =>
        new SecretComponent(this.app, element)
          .setValue(this.plugin.settings.wechatAppSecretName)
          .onChange(async (value) => {
            this.plugin.settings.wechatAppSecretName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("微信默认开启评论")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.wechatOpenComments)
          .onChange(async (value) => {
            this.plugin.settings.wechatOpenComments = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Webhook 目标平台")
      .setDesc("用逗号分隔，例如：知乎, 掘金；自建服务负责转发到各平台草稿箱")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.webhookPlatformName)
          .onChange(async (value) => {
            this.plugin.settings.webhookPlatformName = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Webhook 默认作者")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.draftDefaultAuthor)
          .onChange(async (value) => {
            this.plugin.settings.draftDefaultAuthor = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Webhook 默认原文链接")
      .addText((text) => {
        text
          .setPlaceholder("https://example.com/article")
          .setValue(this.plugin.settings.draftDefaultSourceUrl)
          .onChange(async (value) => {
            this.plugin.settings.draftDefaultSourceUrl = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("多平台 Webhook 地址")
      .setDesc("只有主动保存草稿时才发送生成后的卡片图片")
      .addText((text) => {
        text
          .setPlaceholder("https://publisher.example.com/drafts")
          .setValue(this.plugin.settings.webhookEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.webhookEndpoint = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Webhook 访问令牌")
      .setDesc("可选，使用 Bearer Token；保存在 Obsidian SecretStorage")
      .addComponent((element) =>
        new SecretComponent(this.app, element)
          .setValue(this.plugin.settings.webhookTokenSecretName)
          .onChange(async (value) => {
            this.plugin.settings.webhookTokenSecretName = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderCustomTemplates(
    containerEl: HTMLElement
  ): void {
    new Setting(containerEl)
      .setName("自定义模板")
      .setHeading();
    let templateName = "";

    new Setting(containerEl)
      .setName("复制当前模板")
      .setDesc("以当前模板和样式创建可复用模板")
      .addText((text) => {
        text
          .setPlaceholder("模板名称")
          .onChange((value) => {
            templateName = value.trim();
          });
      })
      .addButton((button) => {
        button.setButtonText("创建").onClick(async () => {
          if (!templateName) {
            new Notice("请填写自定义模板名称");
            return;
          }

          const custom = createCustomTemplate(
            this.plugin.settings,
            templateName
          );
          this.plugin.settings.customTemplates.push(custom);
          this.plugin.settings.templateSelection =
            `custom:${custom.id}`;
          await this.plugin.saveSettings();
          this.refreshSettings();
        });
      });

    let importJson = "";
    new Setting(containerEl)
      .setName("导入 / 导出 JSON")
      .setDesc("粘贴模板 JSON 后导入，或复制全部模板")
      .addTextArea((text) => {
        text
          .setPlaceholder('{"name":"我的模板", ...}')
          .onChange((value) => {
            importJson = value;
          });
        text.inputEl.rows = 4;
      })
      .addButton((button) => {
        button.setButtonText("导入").onClick(async () => {
          try {
            const templates = parseCustomTemplates(importJson);
            this.plugin.settings.customTemplates = mergeCustomTemplates(
              this.plugin.settings.customTemplates,
              templates
            );
            await this.plugin.saveSettings();
            new Notice(`已导入 ${templates.length} 个模板`);
            this.refreshSettings();
          } catch (error) {
            new Notice(
              `导入失败：${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`
            );
          }
        });
      })
      .addButton((button) => {
        button.setButtonText("复制 JSON").onClick(async () => {
          try {
            await navigator.clipboard.writeText(
              JSON.stringify(
                this.plugin.settings.customTemplates,
                null,
                2
              )
            );
            new Notice("自定义模板 JSON 已复制");
          } catch {
            new Notice("复制失败，请检查剪贴板权限");
          }
        });
      });

    for (const template of this.plugin.settings.customTemplates) {
      new Setting(containerEl)
        .setName(template.name)
        .setDesc(
          `基于 ${getTemplateName(template.baseTemplateId)}`
        )
        .addExtraButton((button) => {
          button
            .setIcon("trash")
            .setTooltip("删除模板")
            .onClick(async () => {
              this.plugin.settings.customTemplates =
                this.plugin.settings.customTemplates.filter(
                  (item) => item.id !== template.id
                );
              await this.plugin.saveSettings();
              this.refreshSettings();
            });
        });
    }
  }

}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function applyBuiltInTemplate(
  settings: XhsTextCardPlugin["settings"],
  templateId: TemplateId
): void {
  const config = getTemplate(templateId).config;

  settings.fontSize = readNumber(config.fontSize, 18);
  settings.lineHeight = readNumber(config.lineHeight, 1.7);
  settings.letterSpacing = readNumber(
    config.letterSpacing,
    0.3
  );
  settings.textPadding = readNumber(config.textPadding, 45);
  settings.bgColor = readColor(config.bgColor, "#ffffff");
  settings.textColor = readColor(
    config.textColor,
    "#1a1a1a"
  );
  settings.accentColor = readColor(
    config.accentColor,
    "#8c3a3a"
  );
  settings.fontFamily =
    typeof config.fontFamily === "string"
      ? config.fontFamily
      : "inherit";
  settings.showPageNumber = config.showPageNumber !== false;
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

function getFixedTemplateBackground(
  templateId: TemplateId
): string {
  const value = getTemplate(templateId).config.bgColor;

  return typeof value === "string" ? value : "#ffffff";
}
