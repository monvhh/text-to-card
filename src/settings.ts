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
  templateId: "starry-night",
  templateSelection: "starry-night",
  exportFormat: "png",
  outputFolder: "XHS-Cards",
  includeCover: true,
  coverImagePath: "",
  signatureText: "",
  stripFrontmatter: true,
  fontSize: 17,
  lineHeight: 1.8,
  letterSpacing: 0.5,
  textPadding: 45,
  bgColor: "#0c1445",
  textColor: "#e2e8f0",
  accentColor: "#fbbf24",
  watermarkText: "",
  showPageNumber: true,
  insertLinksAfterGenerate: false,
  copyFirstImageAfterGenerate: false,
  revealOutputAfterGenerate: false,
  maxPages: 0,
  fontFamily: "inherit",
  logoPath: "",
  brandPresetId: "",
  brandPresets: [],
  customTemplates: [],
  favoriteTemplateIds: [],
  recentTemplateIds: [],
  updateExisting: false,
  outputNameSuffix: ""
};
