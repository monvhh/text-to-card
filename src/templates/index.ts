import auraGradient from "./aura-gradient.json";
import blank from "./blank.json";
import cinematicFilm from "./cinematic-film.json";
import deepNight from "./deep-night.json";
import elegantBook from "./elegant-book.json";
import iosMemo from "./ios-memo.json";
import minimalistMagazine from "./minimalist-magazine.json";
import notionStyle from "./notion-style.json";
import polaroid from "./polaroid.json";
import proDoc from "./pro-doc.json";
import starryNight from "./starry-night.json";
import swissStudio from "./swiss-studio.json";

import auraGradientCover from "../assets/covers/cover-aura-gradient.jpg";
import blankCover from "../assets/covers/cover-blank.jpg";
import cinematicFilmCover from "../assets/covers/cover-cinematic-film.jpg";
import deepNightCover from "../assets/covers/cover-deep-night.jpg";
import elegantBookCover from "../assets/covers/cover-elegant-book.jpg";
import iosMemoCover from "../assets/covers/cover-ios-memo.jpg";
import minimalistMagazineCover from "../assets/covers/cover-minimalist-magazine.jpg";
import notionStyleCover from "../assets/covers/cover-notion-style.jpg";
import polaroidCover from "../assets/covers/cover-polaroid.jpg";
import proDocCover from "../assets/covers/cover-pro-doc.jpg";
import starryNightCover from "../assets/covers/cover-starry-night.jpg";
import swissStudioCover from "../assets/covers/cover-swiss-studio.jpg";

type RawTemplate = {
  name: string;
  description?: string;
  config: Record<string, unknown>;
};

const rawTemplates = {
  "cinematic-film": cinematicFilm,
  "starry-night": starryNight,
  polaroid,
  "notion-style": notionStyle,
  "elegant-book": elegantBook,
  "ios-memo": iosMemo,
  "swiss-studio": swissStudio,
  "minimalist-magazine": minimalistMagazine,
  "aura-gradient": auraGradient,
  "deep-night": deepNight,
  "pro-doc": proDoc,
  blank
} as const;

const coverImages: Record<keyof typeof rawTemplates, string> = {
  "cinematic-film": cinematicFilmCover,
  "starry-night": starryNightCover,
  polaroid: polaroidCover,
  "notion-style": notionStyleCover,
  "elegant-book": elegantBookCover,
  "ios-memo": iosMemoCover,
  "swiss-studio": swissStudioCover,
  "minimalist-magazine": minimalistMagazineCover,
  "aura-gradient": auraGradientCover,
  "deep-night": deepNightCover,
  "pro-doc": proDocCover,
  blank: blankCover
};

export type TemplateId = keyof typeof rawTemplates;

export interface XhsTemplate {
  id: TemplateId;
  name: string;
  description?: string;
  config: Record<string, unknown>;
}

export const TEMPLATE_IDS = Object.keys(rawTemplates) as TemplateId[];

export function getTemplate(templateId: TemplateId): XhsTemplate {
  const raw = rawTemplates[templateId] as unknown as RawTemplate;

  return {
    id: templateId,
    name: raw.name,
    description: raw.description,
    config: {
      ...raw.config,
      coverImage: coverImages[templateId]
    }
  };
}

export function getTemplateName(templateId: TemplateId): string {
  return getTemplate(templateId).name;
}
