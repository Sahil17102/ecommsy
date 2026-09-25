import "./lib/dayjs"; // must run before antd pickers render — extends dayjs plugins
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ErrorBoundary } from "./components/common";
import { Toaster } from "sonner";
import App from "./App";
import { getAntdTheme, injectThemeVars } from "./theme";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

injectThemeVars();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ConfigProvider theme={getAntdTheme("light")}>
            <ErrorBoundary>
              <BrowserRouter>
                <AuthProvider>
                  <App />
                  <Toaster position="top-center" richColors closeButton />
                </AuthProvider>
              </BrowserRouter>
            </ErrorBoundary>
          </ConfigProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
