import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import SupportFlowApp from "@/components/supportflow/SupportFlowApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SupportFlowApp />
    </ThemeProvider>
  </StrictMode>
);
