import { useState } from "react";
import { Outlet } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { getThemeVarsStyle, getAntdTheme } from "@/theme";

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { mode } = useTheme();

  return (
    <ConfigProvider theme={getAntdTheme(mode)}>
      <div
        className="min-h-screen bg-background flex"
        style={getThemeVarsStyle(mode)}
        data-theme={mode}
      >
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          collapsed={sidebarCollapsed}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader
            onMobileMenuOpen={() => setMobileOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}
