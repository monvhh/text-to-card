export interface FontPreset {
  id: string;
  name: string;
  value: string;
}

export const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: "system",
    name: "苹方 / 系统默认（简约）",
    value:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
  },
  {
    id: "smiley-sans",
    name: "得意黑（潮流时尚）",
    value: "'Smiley Sans', sans-serif"
  },
  {
    id: "lxgw-wenkai",
    name: "霞鹜文楷（文艺书卷）",
    value: "'LXGW WenKai Screen', sans-serif"
  },
  {
    id: "noto-serif-sc",
    name: "思源宋体（优雅大气）",
    value: "'Noto Serif SC', serif"
  },
  {
    id: "noto-sans-sc",
    name: "思源黑体（标准清晰）",
    value: "'Noto Sans SC', sans-serif"
  },
  {
    id: "zcool-qingke",
    name: "站酷黄油体（创意趣味）",
    value: "'ZCOOL QingKe HuangYou', cursive"
  },
  {
    id: "zcool-kuaile",
    name: "站酷快乐体（活泼灵动）",
    value: "'ZCOOL KuaiLe', cursive"
  },
  {
    id: "ma-shan-zheng",
    name: "马善政毛笔（艺术书法）",
    value: "'Ma Shan Zheng', cursive"
  },
  {
    id: "kaiti",
    name: "楷体（经典传承）",
    value: "'STKaiti', 'KaiTi', serif"
  }
];

export const CUSTOM_FONT_PRESET_ID = "custom";

export function findFontPresetByValue(
  value: string
): FontPreset | undefined {
  return FONT_PRESETS.find(
    (preset) => preset.value === value
  );
}
