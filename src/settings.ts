import type { TemplateId } from "./templates";

export type ExportFormat = "png" | "jpeg";

export interface BrandPreset {
  id: string;
  name: string;
  signatureText: string;
  watermarkText: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  logoPath: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  baseTemplateId: TemplateId;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textPadding: number;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}

export interface XhsTextCardSettings {
  templateId: TemplateId;
  templateSelection: string;
  exportFormat: ExportFormat;
  outputFolder: string;
  includeCover: boolean;
  coverImagePath: string;
  signatureText: string;
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
  brandPresets: BrandPreset[];
  customTemplates: CustomTemplate[];
  favoriteTemplateIds: string[];
  recentTemplateIds: string[];
  updateExisting: boolean;
  outputNameSuffix: string;
}

export const DEFAULT_SETTINGS: XhsTextCardSettings = {
  templateId: "minimalist-magazine",
  templateSelection: "minimalist-magazine",
  exportFormat: "png",
  outputFolder: "XHS-Cards",
  includeCover: true,
  coverImagePath: "",
  signatureText: "",
  stripFrontmatter: true,
  fontSize: 18,
  lineHeight: 1.7,
  letterSpacing: 0.3,
  textPadding: 45,
  bgColor: "#ffffff",
  textColor: "#1a1a1a",
  accentColor: "#8c3a3a",
  watermarkText: "",
  showPageNumber: true,
  insertLinksAfterGenerate: false,
  copyFirstImageAfterGenerate: false,
  revealOutputAfterGenerate: false,
  maxPages: 0,
  fontFamily: "'Noto Serif SC', serif",
  logoPath: "",
  brandPresetId: "",
  brandPresets: [],
  customTemplates: [],
  favoriteTemplateIds: [],
  recentTemplateIds: [],
  updateExisting: false,
  outputNameSuffix: ""
};
