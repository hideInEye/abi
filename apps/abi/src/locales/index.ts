import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { localStg } from '@/utils/storage';

type Translation = App.I18n.Schema['translation'];

const localeLoaders: Record<App.I18n.LangType, () => Promise<{ default: Translation }>> = {
  'en-US': () => import('./langs/en-us'),
  'zh-CN': () => import('./langs/zh-cn')
};
const localePromises = new Map<App.I18n.LangType, Promise<Translation>>();
let requestedLocale: App.I18n.LangType = localStg.get('lang') || 'zh-CN';

function loadLocale(locale: App.I18n.LangType) {
  const cached = localePromises.get(locale);
  if (cached) return cached;

  const promise = localeLoaders[locale]().then(module => module.default);
  localePromises.set(locale, promise);
  return promise;
}

/** Setup plugin i18n */
export async function setupI18n() {
  const locale = localStg.get('lang') || 'zh-CN';
  requestedLocale = locale;
  const translation = await loadLocale(locale);

  await i18n.use(initReactI18next).init({
    interpolation: {
      escapeValue: false
    },
    lng: locale,
    resources: {
      [locale]: { translation }
    }
  });
}

export const $t = i18n.t;

export function setLng(locale: App.I18n.LangType) {
  requestedLocale = locale;
  void loadLocale(locale).then(translation => {
    if (!i18n.hasResourceBundle(locale, 'translation')) {
      i18n.addResourceBundle(locale, 'translation', translation, true, true);
    }
    if (requestedLocale === locale) return i18n.changeLanguage(locale);
    return undefined;
  });
}
