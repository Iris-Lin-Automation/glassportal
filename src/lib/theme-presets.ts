/**
 * Theme catalog lives in `@/config/themes`.
 * Re-exported here so existing `@/lib/theme-presets` imports keep working.
 */
export {
  THEME_PRESETS,
  getThemePreset,
  normalizeThemeId,
  themeBrandColor,
  type ThemePreset,
} from "@/config/themes";
