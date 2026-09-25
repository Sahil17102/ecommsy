import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, Spin, message } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import App from "./App";
import AppSpinner from "./components/common/AppSpinner";
import { getAntdTheme, injectThemeVars } from "./theme";
import "./index.css";

// Read saved theme before first paint to avoid light-mode flash
const savedTheme = localStorage.getItem("box-and-beyond-admin-theme");
const initialMode = savedTheme === "dark" || savedTheme === "light"
  ? savedTheme
  : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
injectThemeVars(initialMode);

// Replace Ant Design's default dotted spinner globally
Spin.setDefaultIndicator(<AppSpinner />);

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        message.error(error.message || "Something went wrong");
      },
    },
  },
});

/** Reads theme mode from context and passes it to AntD ConfigProvider */
function AntdThemeGate({ children }: { children: React.ReactNode }) {
  const { mode } = useTheme();
  return <ConfigProvider theme={getAntdTheme(mode)}>{children}</ConfigProvider>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AntdThemeGate>
          <ErrorBoundary>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </AntdThemeGate>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
