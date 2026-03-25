import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileText } from "lucide-react";

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: Array<"student" | "staff" | "admin">;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto animate-pulse">
                        <FileText className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to their appropriate portal
        const roleRoutes: Record<string, string> = {
            student: "/student",
            staff: "/staff",
            admin: "/admin",
        };
        return <Navigate to={roleRoutes[user.role] || "/"} replace />;
    }

    return <>{children}</>;
}
