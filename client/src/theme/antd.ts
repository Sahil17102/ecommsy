import type { ThemeConfig } from "antd";
import { theme as antdThemeLib } from "antd";
import { theme, lightColors, darkColors, type ThemeMode } from "./theme";

/** Build Ant Design theme config for a given mode */
export function getAntdTheme(mode: ThemeMode): ThemeConfig {
  const colors = mode === "dark" ? darkColors : lightColors;

  return {
    algorithm:
      mode === "dark"
        ? antdThemeLib.darkAlgorithm
        : antdThemeLib.defaultAlgorithm,
    token: {
      colorPrimary: colors.primary,
      borderRadius: theme.radius.md,
      fontFamily: theme.fontFamily.sans,
      ...(mode === "dark" && {
        colorBgContainer: darkColors.bgElevated,
        colorBgElevated: "#243147",
        colorBgLayout: darkColors.bg,
        colorBorder: darkColors.border,
        colorBorderSecondary: darkColors.borderLight,
        colorText: darkColors.text,
        colorTextSecondary: darkColors.textSecondary,
        colorTextTertiary: darkColors.textTertiary,
      }),
    },
    components: {
      Button: {
        primaryShadow: "none",
        controlHeight: 40,
      },
      Card: {
        borderRadiusLG: theme.radius.lg,
      },
      Spin: {
        colorPrimary: colors.primary,
      },
    },
  };
}

/** Ant Design theme derived from shared theme tokens — no hardcoded values */
export const antdTheme: ThemeConfig = getAntdTheme("light");
