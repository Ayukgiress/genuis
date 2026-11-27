import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { GlobalWorkspaceTools } from "@/components/global/GlobalWorkspaceTools";
import { GlobalNetworkStatus } from "@/components/global/GlobalNetworkStatus";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Genuis",
  description: "AI-powered resume analysis and management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <AuthProvider>
          {children}
          <GlobalWorkspaceTools />
          <GlobalNetworkStatus />
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
