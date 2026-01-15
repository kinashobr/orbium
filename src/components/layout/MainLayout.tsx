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
  return <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        
      </header>

      <div className="flex-1 flex w-full relative">
        <Sidebar />

        <main className={cn(
          "flex-1 min-h-[calc(100vh-3.5rem)] px-4 sm:px-6 md:px-8 lg:px-10 pb-24 md:pb-8 pt-4 sm:pt-6 transition-all duration-300 w-full mx-auto",
          sidebarCollapsed ? "md:ml-20" : "md:ml-[168px]"
        )}>
          <div className="max-w-[1400px] mx-auto w-full space-y-4 sm:space-y-6">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>;
}