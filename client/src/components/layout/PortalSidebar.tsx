import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Home,
  GraduationCap,
  Users,
  Shield,
  ChevronLeft,
  Menu,
  LogOut,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface QuickStat {
  label: string;
  value: number | string;
}

interface PortalSidebarProps {
  portalType: "student" | "staff" | "admin";
  quickStats?: QuickStat[];
}

export function PortalSidebar({ portalType, quickStats }: PortalSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  const portalConfig = {
    student: {
      title: "Student Portal",
      icon: GraduationCap,
      navItems: [
        { label: "Home", href: "/", icon: Home },
        { label: "My Resumes", href: "/student", icon: FileText },
      ],
    },
    staff: {
      title: "Staff Portal",
      icon: Users,
      navItems: [
        { label: "Home", href: "/", icon: Home },
        { label: "Review Queue", href: "/staff", icon: FileText },
      ],
    },
    admin: {
      title: "Admin Portal",
      icon: Shield,
      navItems: [
        { label: "Home", href: "/", icon: Home },
        { label: "Dashboard", href: "/admin", icon: BarChart3 },
      ],
    },
  };

  const config = portalConfig[portalType];
  const navItems = config.navItems;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-sidebar text-sidebar-foreground"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-40",
          collapsed ? "-translate-x-full md:translate-x-0 md:w-20" : "w-72",
          "md:relative"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="font-bold text-lg text-sidebar-primary">
                    {config.title}
                  </h1>
                  <p className="text-xs text-sidebar-foreground/60">Resume Review</p>
                </div>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  collapsed && "rotate-180"
                )}
              />
            </Button>
          </div>
        </div>

        {/* User Info */}
        {user && !collapsed && (
          <div className="px-6 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">
              Navigation
            </p>
          )}
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats */}
        {quickStats && quickStats.length > 0 && !collapsed && (
          <div className="px-4 py-4 border-t border-sidebar-border">
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-3">
              Quick Stats
            </p>
            <div className="space-y-2">
              {quickStats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent/30"
                >
                  <span className="text-sm text-sidebar-foreground/80">
                    {stat.label}
                  </span>
                  <span className="font-semibold text-sidebar-primary">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Legend for Student */}
        {portalType === "student" && !collapsed && (
          <div className="px-4 py-4 border-t border-sidebar-border">
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-3">
              Status Legend
            </p>
            <div className="space-y-2 px-3">
              {[
                { label: "Draft", color: "bg-slate-400" },
                { label: "Submitted", color: "bg-blue-500" },
                { label: "Changes Required", color: "bg-amber-500" },
                { label: "Approved", color: "bg-green-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-xs text-sidebar-foreground/70">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10",
              collapsed ? "justify-center" : "justify-start"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
