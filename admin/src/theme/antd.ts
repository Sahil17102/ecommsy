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
      Table: {
        // Use opaque equivalents for header & hover so fixed/sticky columns
        // don't show transparent bleed-through on scroll.
        headerBg: colors.primaryBgSolid,
        headerColor: colors.textTertiary,
        headerSplitColor: "transparent",
        headerBorderRadius: 0,
        cellPaddingBlock: 14,
        cellPaddingInline: 16,
        cellPaddingBlockSM: 10,
        cellPaddingInlineSM: 12,
        rowHoverBg: colors.primaryBgSolid,
        rowExpandedBg: colors.surfaceMuted,
        borderColor: colors.borderLight,
        colorBgContainer: colors.bgElevated,
      },
      Tag: {
        borderRadiusSM: 6,
        defaultBg: colors.surfaceMuted,
        defaultColor: colors.textSecondary,
      },
      Switch: {
        colorPrimary: colors.primary,
        colorPrimaryHover: colors.primaryHover,
      },
      Spin: {
        colorPrimary: colors.primary,
      },
      Pagination: {
        colorPrimary: colors.primary,
        colorPrimaryHover: colors.primaryHover,
        colorText: colors.textSecondary,
        colorTextDisabled: colors.textTertiary,
        colorBgTextHover: colors.primaryBg,
        colorBgTextActive: colors.primaryBg,
        colorBorder: colors.border,
        itemActiveBg: colors.primaryLight,
        itemBg: "transparent",
        borderRadius: theme.radius.sm,
      },
    },
  };
}

/** Ant Design theme derived from shared theme tokens — no hardcoded values */
export const antdTheme: ThemeConfig = getAntdTheme("light");
