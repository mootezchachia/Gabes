/**
 * Returns true when a KeyboardEvent's target (or any ancestor) is an editable
 * field or a widget that consumes keystrokes for its own purposes.
 *
 * Shortcut handlers throughout the app call this FIRST and bail early so that
 * typing in an input, textarea, Base UI Select (role="combobox"), dialog
 * search field, etc. never fires app-level hotkeys like V/P/S/I/1–5.
 *
 * We check via `closest()` rather than just `target.tagName` because the
 * event's direct target is sometimes a child span/svg rather than the
 * interactive element itself — notably with Base UI primitives that wrap
 * triggers in layout spans.
 */
const TYPING_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="searchbox"]',
  '[role="textbox"]',
  '[role="spinbutton"]',
  '[role="menu"]',
  '[role="menuitem"]',
  "[data-nafas-trap-keys]",
].join(",");

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  // Native HTMLElement shortcuts — cheap and catches the common case.
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  const asHtml = target as HTMLElement;
  if (asHtml.isContentEditable) return true;
  return Boolean(target.closest(TYPING_SELECTOR));
}
