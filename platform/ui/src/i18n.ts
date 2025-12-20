import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "./translations/en-us.json";
import plTranslation from "./translations/pl-pl.json";
import hiTranslation from "./translations/hi-in.json";
import pzTranslation from "./translations/pz-pz.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",

    resources: {
      en: {
        translation: enTranslation,
      },
      pl: {
        translation: plTranslation,
      },
      hi: {
        translation: hiTranslation,
      },
      pz: {
        translation: pzTranslation,
      },
    },

    supportedLngs: ["en", "pl", "hi", "pz"],

    load: "languageOnly",

    defaultNS: "translation",
    ns: ["translation"],

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "sessionStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
