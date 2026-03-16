import React from "react";
import ReactDOM from "react-dom/client";
import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/shared/hooks/useAuth";
import "@/styles/base.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);
