import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";
interface MainLayoutProps {
  children: React.ReactNode;
}
export function MainLayout({
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail);
    };
    window.addEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
    };
  }, []);
  return <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        
      </header>

      <div className="flex-1 flex w-full">
        <Sidebar />

        <main className={cn("flex-1 min-h-[calc(100vh-3.5rem)] px-3 md:px-6 pb-20 md:pb-8 pt-4 md:pt-6 transition-all duration-300", sidebarCollapsed ? "md:ml-20" : "md:ml-[208px]")}>
          <div className="max-w-[min(1400px,95vw)] mx-auto space-y-4">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>;
}