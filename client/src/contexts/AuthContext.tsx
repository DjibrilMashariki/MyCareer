import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface User {
    id: string;
    email: string;
    fullName: string;
    role: "student" | "staff" | "admin";
}

interface AuthContextType {
    user: User | null;
    session: any | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string, role: "student" | "staff") => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        initializeAuth();

        if (isSupabaseConfigured()) {
            // Listen for auth state changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (_event, session) => {
                    setSession(session);
                    if (session?.user) {
                        await fetchUserProfile(session.access_token);
                    } else {
                        setUser(null);
                    }
                }
            );

            return () => subscription.unsubscribe();
        }
    }, []);

    async function initializeAuth() {
        try {
            // Check localStorage for demo mode session
            const storedUser = localStorage.getItem("mycareer_user");
            const storedToken = localStorage.getItem("mycareer_token");

            if (storedUser && storedToken) {
                setUser(JSON.parse(storedUser));
                setSession({ access_token: storedToken });
                setLoading(false);
                return;
            }

            if (isSupabaseConfigured()) {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                if (session?.access_token) {
                    await fetchUserProfile(session.access_token);
                }
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchUserProfile(token: string) {
        try {
            const response = await fetch("/api/auth/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const profile = await response.json();
                const userData: User = {
                    id: profile.id,
                    email: profile.email,
                    fullName: profile.fullName,
                    role: profile.role,
                };
                setUser(userData);
                localStorage.setItem("mycareer_user", JSON.stringify(userData));
                localStorage.setItem("mycareer_token", token);
            }
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
        }
    }

    async function signUp(
        email: string,
        password: string,
        fullName: string,
        role: "student" | "staff"
    ): Promise<void> {
        const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, fullName, role }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Signup failed");
        }
    }

    async function signIn(email: string, password: string): Promise<void> {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Login failed");
        }

        const userData: User = {
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.fullName,
            role: data.user.role,
        };

        setUser(userData);
        setSession(data.session);
        localStorage.setItem("mycareer_user", JSON.stringify(userData));
        localStorage.setItem("mycareer_token", data.session.access_token);
    }

    async function signOut(): Promise<void> {
        try {
            const token = await getToken();
            if (token) {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setUser(null);
            setSession(null);
            localStorage.removeItem("mycareer_user");
            localStorage.removeItem("mycareer_token");
        }
    }

    async function getToken(): Promise<string | null> {
        const storedToken = localStorage.getItem("mycareer_token");
        if (storedToken) return storedToken;

        if (isSupabaseConfigured()) {
            const { data: { session } } = await supabase.auth.getSession();
            return session?.access_token || null;
        }

        return null;
    }

    return (
        <AuthContext.Provider
            value={{ user, session, loading, signUp, signIn, signOut, getToken }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
