"use client";

import { useState } from "react";
import { LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PatientAuthProps {
    onAuthChange: () => Promise<void>;
}

export function PatientAuth({ onAuthChange }: PatientAuthProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password || (mode === "signup" && !name)) {
            setStatus("Complete all required fields.");
            return;
        }

        setIsSubmitting(true);
        setStatus(mode === "login" ? "Signing in..." : "Creating account...");

        if (mode === "login") {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setStatus(error.message);
                setIsSubmitting(false);
                return;
            }

            setStatus("Signed in successfully.");
            await onAuthChange();
            setIsSubmitting(false);
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: "patient",
                },
            },
        });

        if (error) {
            setStatus(error.message);
            setIsSubmitting(false);
            return;
        }

        if (data.session) {
            setStatus("Account created and signed in.");
            await onAuthChange();
            setIsSubmitting(false);
            return;
        }

        setStatus(
            "Account created. Please check your email to confirm your account, then sign in."
        );
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                <Button
                    type="button"
                    variant={mode === "login" ? "default" : "ghost"}
                    className="flex-1 rounded-xl"
                    onClick={() => setMode("login")}
                >
                    Login
                </Button>
                <Button
                    type="button"
                    variant={mode === "signup" ? "default" : "ghost"}
                    className="flex-1 rounded-xl"
                    onClick={() => setMode("signup")}
                >
                    Register
                </Button>
            </div>

            {mode === "signup" ? (
                <Input
                    placeholder="Full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-2xl bg-white"
                />
            ) : null}

            <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl bg-white"
            />

            <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl bg-white"
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        void handleSubmit();
                    }
                }}
            />

            <Button
                className="w-full rounded-2xl"
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
            >
                {isSubmitting ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : mode === "login" ? (
                    <LogIn className="mr-2 h-4 w-4" />
                ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                )}
                {mode === "login" ? "Login to portal" : "Create patient account"}
            </Button>

            {status ? <p className="text-xs text-slate-500">{status}</p> : null}
        </div>
    );
}
