import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json'; // Path to English translations
import ru from './locales/ru.json'; // Path to Russian translations

// Initialize i18n
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: localStorage.getItem('language') || 'ru',
  fallbackLng: 'ru', // Fallback language
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
