"use client";

import { useState } from "react";
import { LoaderCircle, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StaffLoginProps {
    isLoggedIn: boolean;
    userRole: "patient" | "doctor" | "admin" | null;
    onAuthChange: () => Promise<void>;
}

export function StaffLogin({
    isLoggedIn,
    userRole,
    onAuthChange,
}: StaffLoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authStatus, setAuthStatus] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setAuthStatus("Enter both staff email and password.");
            return;
        }

        setIsSubmitting(true);
        setAuthStatus("Signing in...");

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setAuthStatus(error.message);
            setIsSubmitting(false);
            return;
        }

        setEmail("");
        setPassword("");
        setAuthStatus("Signed in successfully.");
        await onAuthChange();
        setIsSubmitting(false);
    };

    const handleLogout = async () => {
        setIsSubmitting(true);
        await supabaseClient.auth.signOut();
        setAuthStatus("Signed out.");
        await onAuthChange();
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <ShieldCheck className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">Staff Access</h3>
                    <p className="text-xs text-slate-500">
                        Doctor and admin dashboards require Supabase login.
                    </p>
                </div>
            </div>

            {isLoggedIn ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Active role
                            </p>
                            <p className="mt-1 font-semibold capitalize text-slate-900">
                                {userRole}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            disabled={isSubmitting}
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <Input
                        type="email"
                        placeholder="Staff email"
                        className="rounded-xl bg-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                void handleLogin();
                            }
                        }}
                    />

                    <Input
                        type="password"
                        placeholder="Password"
                        className="rounded-xl bg-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                void handleLogin();
                            }
                        }}
                    />

                    <Button
                        className="w-full rounded-xl"
                        disabled={isSubmitting}
                        onClick={handleLogin}
                    >
                        {isSubmitting ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                        )}
                        Login
                    </Button>
                </div>
            )}

            {authStatus ? (
                <p className="text-xs text-slate-500">{authStatus}</p>
            ) : null}
        </div>
    );
}
