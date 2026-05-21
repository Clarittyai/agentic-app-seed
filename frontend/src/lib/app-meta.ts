/*
 * App identity. The platform overwrites this file per generated app with the
 * real name + description; the values here are neutral defaults so the seed
 * builds and runs standalone. NEVER hardcode a platform/template name here.
 */
export const appName = 'App';
export const appDescription = '';

// The marketplace widget host labels the widget from document.title, so set it
// from the app's OWN name (this is what makes the widget announce itself
// correctly instead of the seed/template title).
if (typeof document !== 'undefined' && appName) {
  document.title = appName;
}
