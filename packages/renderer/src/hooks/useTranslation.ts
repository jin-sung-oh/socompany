import { useSettingsStore } from "../stores/useSettingsStore";
import ko from "../i18n/ko.json";
import en from "../i18n/en.json";

type Translations = typeof ko;

export const useTranslation = () => {
  const { settings } = useSettingsStore();
  const lang = settings.language || "ko";

  const t = (key: string): string => {
    const translations: Record<string, any> = lang === "ko" ? ko : en;
    const keys = key.split(".");
    let result = translations;

    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return key; // key not found
      }
    }

    return result as unknown as string;
  };

  return { t, language: lang };
};
