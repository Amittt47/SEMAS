/**
 * Root Layout — seim/app/layout.tsx
 * Replace your existing layout.tsx with this file.
 */
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

export const metadata: Metadata = {
  title: "SEMAS",
  description: "Security Information & Event Management Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
