import type {
  InstallationGuideContent,
  LanguageCode,
} from "@/lib/i18n/messages";

import { getLocalizedApiInstallationGuide } from "@/lib/i18n/installation-guides/api";
import { getLocalizedMobileInstallationGuide } from "@/lib/i18n/installation-guides/mobile";
import { getLocalizedWebInstallationGuide } from "@/lib/i18n/installation-guides/web";

export type InteractiveInstallationGuideSlug =
  | "installation-api"
  | "installation-web"
  | "installation-mobile";

export type ExtraInstallationGuideSlug = Exclude<
  InteractiveInstallationGuideSlug,
  "installation-api"
>;

export function getLocalizedInteractiveInstallationGuide(
  language: LanguageCode,
  slug: InteractiveInstallationGuideSlug,
): InstallationGuideContent {
  if (slug === "installation-api") {
    return getLocalizedApiInstallationGuide(language);
  }

  if (slug === "installation-web") {
    return getLocalizedWebInstallationGuide(language);
  }

  return getLocalizedMobileInstallationGuide(language);
}

export function getLocalizedExtraInstallationGuide(
  language: LanguageCode,
  slug: ExtraInstallationGuideSlug,
): InstallationGuideContent {
  return getLocalizedInteractiveInstallationGuide(language, slug);
}
