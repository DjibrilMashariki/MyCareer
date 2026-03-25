import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, FileText, MessageSquare, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
    id: string;
    type: "status_change" | "new_assignment" | "new_feedback" | "submission";
    title: string;
    message: string;
    resumeId?: string;
    isRead: boolean;
    createdAt: string;
}

const typeIcons: Record<string, typeof Bell> = {
    status_change: ArrowRight,
    new_assignment: FileText,
    new_feedback: MessageSquare,
    submission: UserPlus,
};

const typeColors: Record<string, string> = {
    status_change: "text-blue-500 bg-blue-500/10",
    new_assignment: "text-purple-500 bg-purple-500/10",
    new_feedback: "text-amber-500 bg-amber-500/10",
    submission: "text-green-500 bg-green-500/10",
};

export function NotificationBell() {
    const { user, getToken } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch("/api/notifications", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const token = await getToken();
            if (!token) return;

            await fetch(`/api/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            setIsLoading(true);
            const token = await getToken();
            if (!token) return;

            await fetch("/api/notifications/read-all", {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const timeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-in zoom-in-50">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in-0 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={markAllAsRead}
                                disabled={isLoading}
                            >
                                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                                Mark all read
                            </Button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-72">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <Bell className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const Icon = typeIcons[notif.type] || Bell;
                                const colorClass = typeColors[notif.type] || "text-muted-foreground bg-muted";

                                return (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "flex items-start gap-3 px-4 py-3 border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/50",
                                            !notif.isRead && "bg-primary/5"
                                        )}
                                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                                    >
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                                colorClass
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p
                                                    className={cn(
                                                        "text-sm truncate",
                                                        !notif.isRead ? "font-semibold" : "font-medium"
                                                    )}
                                                >
                                                    {notif.title}
                                                </p>
                                                {!notif.isRead && (
                                                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 ml-2" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                {timeAgo(notif.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
