"use client";

import { useState } from "react";
import { LoaderCircle, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AuthDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAuthSuccess: () => Promise<void> | void;
}

export function AuthDialog({
    open,
    onOpenChange,
    onAuthSuccess,
}: AuthDialogProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
    };

    const handleSubmit = async () => {
        if (!email || !password || (mode === "signup" && !name.trim())) {
            setStatus("Complete all required fields.");
            return;
        }

        setIsSubmitting(true);
        setStatus(mode === "login" ? "Signing in..." : "Creating account...");

        try {
            if (mode === "login") {
                const { error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    setStatus(error.message);
                    return;
                }

                resetForm();
                setStatus("Signed in successfully.");
                await onAuthSuccess();
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name.trim(),
                        role: "patient",
                    },
                },
            });

            if (error) {
                setStatus(error.message);
                return;
            }

            resetForm();

            if (data.session) {
                setStatus("Account created and signed in.");
                await onAuthSuccess();
                return;
            }

            setStatus(
                "Account created. Please check your email to confirm your account, then sign in."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Unified Login</DialogTitle>
                    <DialogDescription>
                        Patients, doctors, and admins all sign in here. Access is
                        determined after login from your Supabase profile role.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 px-6 pb-6">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                            <ShieldCheck className="h-5 w-5 text-slate-700" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900">One account flow</p>
                            <p className="text-sm text-slate-500">
                                Staff keep their assigned roles. New self-registered
                                accounts are created as patients.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                        <Button
                            type="button"
                            variant={mode === "login" ? "default" : "ghost"}
                            className="min-h-11 flex-1 rounded-xl"
                            onClick={() => setMode("login")}
                        >
                            Login
                        </Button>
                        <Button
                            type="button"
                            variant={mode === "signup" ? "default" : "ghost"}
                            className="min-h-11 flex-1 rounded-xl"
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
                            className="min-h-11 rounded-2xl bg-white"
                        />
                    ) : null}

                    <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="min-h-11 rounded-2xl bg-white"
                    />

                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="min-h-11 rounded-2xl bg-white"
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                void handleSubmit();
                            }
                        }}
                    />

                    <Button
                        className="min-h-11 w-full rounded-2xl"
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
                        {mode === "login" ? "Login" : "Create patient account"}
                    </Button>

                    {status ? (
                        <p className="text-sm leading-6 text-slate-600">{status}</p>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
