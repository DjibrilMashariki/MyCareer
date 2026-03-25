import { ReactNode } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface PortalLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  headerTitle: string;
  headerSubtitle?: string;
}

export function PortalLayout({
  children,
  sidebar,
  headerTitle,
  headerSubtitle,
}: PortalLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {sidebar}

      <main className="flex-1 overflow-auto">
        {/* Page Header */}
        <header className="gradient-primary px-6 py-8 md:px-8">
          <div className="max-w-6xl mx-auto flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white animate-fade-in">
                {headerTitle}
              </h1>
              {headerSubtitle && (
                <p className="text-white/80 mt-2 animate-fade-in">
                  {headerSubtitle}
                </p>
              )}
            </div>
            <div className="text-white">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
