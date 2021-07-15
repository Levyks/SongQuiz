import { addMessages, init, getLocaleFromNavigator } from 'svelte-i18n';

import en from './languages/en.json';
import pt from './languages/pt.json';

addMessages('en', en);
addMessages('pt', pt);

init({
  fallbackLocale: 'en',
  initialLocale: getLocaleFromNavigator(),
});