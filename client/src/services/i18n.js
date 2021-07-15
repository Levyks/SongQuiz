/* Heavily based on Mohammad Ashour's code from here
 * https://phrase.com/blog/posts/a-step-by-step-guide-to-svelte-localization-with-svelte-i18n-v3/#Async_Translation_File_Loading
 *
 * His github: https://github.com/ashour
 */

import { get, derived, writable } from "svelte/store";
import {
  addMessages,
  locale,
  init,
  dictionary,
  getLocaleFromNavigator,
  _,
} from "svelte-i18n";

const MESSAGE_FILE_URL_TEMPLATE = "/lang/{locale}.json";

const DEFAULT_LOCALE = 'en';

const AVAILABLE_LOCALES = [
  'en',
  'pt'
];

let _activeLocale;

const isDownloading = writable(false);

function setupI18n() {

  const navigatorLocale = getLocaleFromNavigator().slice(0,2);

  const initialLocale = AVAILABLE_LOCALES.includes(navigatorLocale) ? navigatorLocale : DEFAULT_LOCALE;
  
  init({initialLocale}); 
  
  // Don't re-download translation files
  if (!hasLoadedLocale(initialLocale)) {
    const messagesFileUrl = 
      MESSAGE_FILE_URL_TEMPLATE.replace(
        "{locale}",
        initialLocale,
      );
    // Download translation file for given locale/language
    return loadJson(messagesFileUrl).then((messages) => {
      // Configure svelte-i18n to use the locale
      _activeLocale = initialLocale;
      addMessages(initialLocale, messages);
      locale.set(initialLocale);
      isDownloading.set(false);
    });
  }
}

function loadJson(url) {
  return fetch(url).then((response) => response.json());
}
function hasLoadedLocale(locale) {
  // If the svelte-i18n dictionary has an entry for the
  // locale, then the locale has already been added
  return get(dictionary)[locale];
}

const isLocaleLoaded = derived(
  [isDownloading, dictionary],
  ([$isDownloading, $dictionary]) =>
    !$isDownloading &&
    $dictionary[_activeLocale] &&
    Object.keys($dictionary[_activeLocale]).length > 0,
);

// We expose the svelte-i18n _ store so that our app has
// a single API for i18n
export { _, setupI18n, isLocaleLoaded };