"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BadgeCheck,
    Calendar as CalendarIcon,
    ClipboardList,
    HeartPulse,
    Hospital,
    LayoutDashboard,
    LoaderCircle,
    LogOut,
    MapPinned,
    Menu,
    MessageCircle,
    PhoneCall,
    Search,
    ShieldCheck,
    Sparkles,
    Stethoscope,
    UserRound,
    Users,
    X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    useComboboxAnchor,
} from "@/components/ui/combobox";
import { AuthDialog } from "@/components/AuthDialog";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { type AppRole, loadUserRole, normalizeAppRole } from "@/lib/auth";
import { departments } from "@/lib/departments";
import { supabaseClient } from "@/lib/supabase-client";
import type {
    Appointment,
    ChatLog,
    EmergencyRequest,
    MedicalSearchItem,
} from "@/types";
import type { User } from "@supabase/supabase-js";

type DashboardTab = "patient" | "portal" | "doctor" | "admin" | "architecture";
type PublicSection = "home" | "assistant" | "appointments" | "emergency";
type NavKey =
    | PublicSection
    | "login"
    | "portal"
    | "my-appointments"
    | "doctor-dashboard"
    | "doctor-appointments"
    | "admin-dashboard"
    | "emergency-requests"
    | "analytics";

interface AppointmentState {
    name: string;
    phone: string;
    date: string;
    department: string;
}

interface AssistantContext {
    recommendation?: {
        department: string;
        consultant: string;
    };
    trustedInfo?: MedicalSearchItem[];
    bookingPrompt?: string;
    disclaimer?: string;
}

interface Message {
    role: "user" | "assistant";
    text: string;
    context?: AssistantContext;
}

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub: string;
}

function StatCard({ icon: Icon, label, value, sub }: StatCardProps) {
    return (
        <Card className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)]">
            <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 ring-1 ring-sky-100">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-2xl font-semibold text-slate-950">{value}</p>
                    <p className="text-xs text-slate-500">{sub}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function SectionHeading({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 ring-1 ring-sky-100">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h2 className="font-heading text-2xl font-semibold text-slate-950">
                    {title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
            <p className="text-base font-semibold text-slate-900">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
    );
}

function DashboardGate({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <Card className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)]">
            <CardContent className="p-8 text-center sm:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <ShieldCheck className="h-6 w-6 text-slate-700" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

function DatePicker({
    value,
    onChange,
}: {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
}) {
    const [open, setOpen] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const anchorRef = useRef<HTMLButtonElement>(null);

    const formatted = value
        ? value.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "Pick a date";

    const handleOpen = () => {
        if (!open && anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            const calendarHeight = 320;
            const spaceBelow = window.innerHeight - rect.bottom;
            const showAbove = spaceBelow < calendarHeight && rect.top > calendarHeight;

            setPopoverStyle({
                position: "fixed",
                left: rect.left,
                width: Math.max(rect.width, 280),
                zIndex: 50,
                ...(showAbove
                    ? { bottom: window.innerHeight - rect.top + 8 }
                    : { top: rect.bottom + 8 }),
            });
        }

        setOpen((current) => !current);
    };

    return (
        <div className="relative">
            <button
                ref={anchorRef}
                type="button"
                onClick={handleOpen}
                aria-label="Choose appointment date"
                className={`flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20 ${
                    value ? "text-slate-900" : "text-slate-400"
                }`}
            >
                <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
                {formatted}
            </button>

            {open ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        style={popoverStyle}
                        className="rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl"
                    >
                        <Calendar
                            mode="single"
                            selected={value}
                            onSelect={(day) => {
                                onChange(day);
                                setOpen(false);
                            }}
                            disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                        />
                    </div>
                </>
            ) : null}
        </div>
    );
}

function DepartmentCombobox({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const anchor = useComboboxAnchor();

    return (
        <Combobox value={value || null} onValueChange={(next) => onChange(next ?? "")}>
            <div ref={anchor} className="w-full">
                <ComboboxInput
                    placeholder="Search department..."
                    className="w-full rounded-2xl bg-white"
                    showClear={Boolean(value)}
                />
            </div>
            <ComboboxContent anchor={anchor} className="z-50">
                <ComboboxList>
                    <ComboboxEmpty>No department found.</ComboboxEmpty>
                    {departments.map((department) => (
                        <ComboboxItem key={department.id} value={department.name}>
                            {department.name}
                        </ComboboxItem>
                    ))}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

function formatAppointmentDate(date: string | null | undefined) {
    if (!date) {
        return "Not scheduled";
    }

    return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(date: string) {
    return new Date(date).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function toDateInputValue(date: Date | undefined) {
    if (!date) {
        return "";
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function buildAiPatientSummary(item: Appointment) {
    const symptomText =
        item.symptoms?.trim() || "Patient did not include detailed symptoms.";

    return `AI-organised summary: ${symptomText} Requested department: ${item.department}. Current urgency: ${item.urgency}. Current status: ${item.status}.`;
}

function getStatusTone(status: Appointment["status"]) {
    if (status === "Approved") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "In Progress") {
        return "bg-sky-100 text-sky-700";
    }

    if (status === "Completed") {
        return "bg-violet-100 text-violet-700";
    }

    if (status === "Rejected" || status === "Cancelled") {
        return "bg-rose-100 text-rose-700";
    }

    return "bg-amber-100 text-amber-700";
}

function getUrgencyTone(urgency: Appointment["urgency"] | ChatLog["urgency"]) {
    if (urgency === "High") {
        return "bg-rose-100 text-rose-700";
    }

    if (urgency === "Medium") {
        return "bg-amber-100 text-amber-700";
    }

    return "bg-emerald-100 text-emerald-700";
}

function isToday(date: string | null | undefined) {
    if (!date) {
        return false;
    }

    const today = new Date();
    const value = new Date(date);

    return today.toDateString() === value.toDateString();
}

export default function SuwaSethaHealthcareAssistant() {
    const appointmentRef = useRef<HTMLDivElement>(null);
    const assistantRef = useRef<HTMLDivElement>(null);
    const patientPortalRef = useRef<HTMLDivElement>(null);
    const doctorAppointmentsRef = useRef<HTMLDivElement>(null);
    const adminEmergencyRef = useRef<HTMLDivElement>(null);
    const adminAnalyticsRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<DashboardTab>("patient");
    const [activeNavKey, setActiveNavKey] = useState<NavKey>("home");
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
    const [symptomText, setSymptomText] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            text: "Hello, I am Suwa Assist. I can provide general health information, help you book appointments, and guide you to the right department. I cannot provide a medical diagnosis.",
        },
    ]);
    const [recommendation, setRecommendation] = useState<{
        department: string;
        consultant: string;
        specialty?: string;
    } | null>(null);
    const [isUrgentRecommendation, setIsUrgentRecommendation] = useState(false);
    const [appointment, setAppointment] = useState<AppointmentState>({
        name: "",
        phone: "",
        date: "",
        department: "",
    });
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [bookingStatus, setBookingStatus] = useState("");
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
    const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
    const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>(
        []
    );
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authStatusMessage, setAuthStatusMessage] = useState("");
    const [appointmentsLoading, setAppointmentsLoading] = useState(false);
    const [patientAppointmentsLoading, setPatientAppointmentsLoading] =
        useState(false);
    const [chatLogsLoading, setChatLogsLoading] = useState(false);
    const [emergencyLoading, setEmergencyLoading] = useState(false);
    const [emergencySubmitting, setEmergencySubmitting] = useState(false);
    const [appointmentsError, setAppointmentsError] = useState("");
    const [patientAppointmentsError, setPatientAppointmentsError] = useState("");
    const [chatLogsError, setChatLogsError] = useState("");
    const [emergencyError, setEmergencyError] = useState("");
    const [emergencyStatus, setEmergencyStatus] = useState("");
    const [savingAppointmentId, setSavingAppointmentId] = useState<string | null>(
        null
    );
    const [savingEmergencyId, setSavingEmergencyId] = useState<string | null>(null);
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
    const [publicNoteDrafts, setPublicNoteDrafts] = useState<Record<string, string>>(
        {}
    );
    const [medicalQuery, setMedicalQuery] = useState("");
    const [medicalLookupLoading, setMedicalLookupLoading] = useState(false);
    const [medicalLookupError, setMedicalLookupError] = useState("");
    const [medicalResults, setMedicalResults] = useState<MedicalSearchItem[]>([]);
    const [medicalSummary, setMedicalSummary] = useState("");
    const [medicalDisclaimer, setMedicalDisclaimer] = useState("");
    const [doctorStatusFilter, setDoctorStatusFilter] = useState("All");
    const [doctorUrgencyFilter, setDoctorUrgencyFilter] = useState("All");
    const [doctorDepartmentFilter, setDoctorDepartmentFilter] = useState("All");
    const [selectedAdminAppointment, setSelectedAdminAppointment] =
        useState<Appointment | null>(null);
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [adminAssignmentForm, setAdminAssignmentForm] = useState({
        status: "Approved",
        appointmentNumber: "",
        queueNumber: "",
        currentQueueNumber: "",
        assignedDoctor: "",
        roomNumber: "",
        appointmentTime: "",
        followUpDate: "",
        publicPatientNotes: "",
    });
    const [feedbackDrafts, setFeedbackDrafts] = useState<
        Record<string, { rating: string; comment: string }>
    >({});
    const [emergencyForm, setEmergencyForm] = useState({
        patientName: "",
        phone: "",
        notes: "",
    });

    const isAuthenticated = currentUser !== null;
    const isPatient = currentRole === "patient";
    const isDoctor = currentRole === "doctor";
    const isAdmin = currentRole === "admin";
    const canViewStaffData = isDoctor || isAdmin;
    const authChecked = !isLoadingAuth;
    const isDevelopment = process.env.NODE_ENV === "development";

    const logAuthDebug = React.useEffectEvent(
        (message: string, details?: Record<string, unknown>) => {
            if (!isDevelopment) {
                return;
            }

            if (details) {
                console.log(`[auth] ${message}`, details);
                return;
            }

            console.log(`[auth] ${message}`);
        }
    );

    const routeToRoleHome = (role: AppRole | null) => {
        if (role === "admin") {
            setActiveTab("admin");
            setActiveNavKey("admin-dashboard");
            return;
        }

        if (role === "doctor") {
            setActiveTab("doctor");
            setActiveNavKey("doctor-dashboard");
            return;
        }

        if (role === "patient") {
            setActiveTab("portal");
            setActiveNavKey("portal");
            return;
        }

        setActiveTab("patient");
        setActiveNavKey("home");
    };

    const syncAuthState = React.useEffectEvent(async () => {
        setIsLoadingAuth(true);
        setAuthStatusMessage("");

        // Use getUser() which validates the JWT server-side, unlike getSession()
        // which only reads from local storage and can return stale/unverified data.
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            logAuthDebug("no active session");
            setCurrentUser(null);
            setCurrentRole(null);
            setIsLoadingAuth(false);
            routeToRoleHome(null);
            return;
        }

        logAuthDebug("auth user id", { userId: user.id });

        const resolveRole = async () => {
            // Step 1: query the profiles table directly from the browser client.
            const initialResult = await loadUserRole(supabaseClient, user);

            logAuthDebug(
                initialResult.profileMissing ? "profile missing" : "profile found",
                {
                    userId: user.id,
                    role: initialResult.role,
                    hasError: Boolean(initialResult.error),
                }
            );

            // Happy path: role is already known.
            if (initialResult.role) {
                return initialResult;
            }

            // Profile row exists but the role value is unrecognized — nothing
            // the server API can fix without manual intervention.
            if (!initialResult.error && !initialResult.profileMissing) {
                return initialResult;
            }

            // Any other case (DB error OR profile missing) — escalate to the
            // server-side ensure-patient API which uses the service-role key
            // and can bypass RLS to create or read the profile row.
            logAuthDebug(
                initialResult.error ? "DB error, escalating to ensure-patient" : "profile missing, calling ensure-patient",
                { userId: user.id }
            );

            const ensureResponse = await fetch("/api/profiles/ensure-patient", {
                method: "POST",
                credentials: "include",
            });

            const ensureData = (await ensureResponse.json()) as {
                role?: string;
                created?: boolean;
                error?: string;
            };

            logAuthDebug("ensure-patient response", {
                status: ensureResponse.status,
                role: ensureData.role,
                created: ensureData.created,
                error: ensureData.error,
            });

            if (!ensureResponse.ok) {
                return {
                    role: null,
                    error: ensureData.error
                        ? new Error(ensureData.error)
                        : new Error("Failed to ensure patient profile."),
                    profileMissing: initialResult.profileMissing,
                };
            }

            // Use the role returned by ensure-patient directly — no second
            // round-trip to the DB which may still be subject to RLS timing.
            const ensuredRole = normalizeAppRole(ensureData.role);

            if (ensuredRole) {
                return { role: ensuredRole, error: null, profileMissing: false };
            }

            // Last resort: retry the DB query once (role may now be visible).
            return loadUserRole(supabaseClient, user);
        };

        const { role, error, profileMissing } = await resolveRole();
        logAuthDebug("resolved role", {
            userId: user.id,
            role,
            profileMissing,
            hasError: Boolean(error),
        });

        setCurrentUser(user);
        setCurrentRole(role);
        setIsLoadingAuth(false);

        if (!appointment.name && user.user_metadata?.full_name) {
            setAppointment((current) => ({
                ...current,
                name: user.user_metadata.full_name as string,
            }));
        }

        if (!appointment.phone && user.phone) {
            setAppointment((current) => ({
                ...current,
                phone: user.phone ?? "",
            }));
        }

        if (error) {
            setAuthStatusMessage(
                "We could not confirm your profile role right now. Please try again."
            );
            return;
        }

        if (!role && profileMissing) {
            setAuthStatusMessage(
                "Your account is signed in, but no profile role is assigned yet."
            );
            return;
        }

        if (!role) {
            setAuthStatusMessage(
                "Your account is signed in, but its role is not recognized."
            );
            return;
        }

        setAuthDialogOpen(false);
        routeToRoleHome(role);
    });

    useEffect(() => {
        let isActive = true;

        const runSync = async () => {
            if (!isActive) return;
            await syncAuthState();
        };

        void runSync();

        const {
            data: { subscription },
        } = supabaseClient.auth.onAuthStateChange((event) => {
            if (!isActive) {
                return;
            }

            // INITIAL_SESSION fires on page load (already handled above),
            // so skip it here to avoid a redundant double-fetch.
            if (event === "INITIAL_SESSION") {
                return;
            }

            void runSync();
        });

        return () => {
            isActive = false;
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let isActive = true;

        const loadStaffAppointments = async () => {
            if (!authChecked || !canViewStaffData) {
                if (isActive) {
                    setAppointments([]);
                    setAppointmentsError("");
                }
                return;
            }

            setAppointmentsLoading(true);
            setAppointmentsError("");

            try {
                const res = await fetch("/api/appointments", {
                    credentials: "include",
                    cache: "no-store",
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load appointments.");
                }

                if (!isActive) {
                    return;
                }

                const nextAppointments = data.appointments ?? [];
                setAppointments(nextAppointments);
                setNoteDrafts(
                    Object.fromEntries(
                        nextAppointments.map((item: Appointment) => [
                            item.id,
                            item.internal_staff_notes ?? "",
                        ])
                    )
                );
                setPublicNoteDrafts(
                    Object.fromEntries(
                        nextAppointments.map((item: Appointment) => [
                            item.id,
                            item.public_patient_notes ?? "",
                        ])
                    )
                );
            } catch (error) {
                if (isActive) {
                    setAppointmentsError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load appointments."
                    );
                }
            } finally {
                if (isActive) {
                    setAppointmentsLoading(false);
                }
            }
        };

        void loadStaffAppointments();

        return () => {
            isActive = false;
        };
    }, [authChecked, canViewStaffData]);

    useEffect(() => {
        let isActive = true;

        const loadPortalAppointments = async () => {
            if (!authChecked || !isPatient) {
                if (isActive) {
                    setPatientAppointments([]);
                    setPatientAppointmentsError("");
                }
                return;
            }

            setPatientAppointmentsLoading(true);
            setPatientAppointmentsError("");

            try {
                const res = await fetch("/api/patient-appointments", {
                    credentials: "include",
                    cache: "no-store",
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load your appointments.");
                }

                if (isActive) {
                    setPatientAppointments(data.appointments ?? []);
                }
            } catch (error) {
                if (isActive) {
                    setPatientAppointmentsError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load your appointments."
                    );
                }
            } finally {
                if (isActive) {
                    setPatientAppointmentsLoading(false);
                }
            }
        };

        void loadPortalAppointments();

        return () => {
            isActive = false;
        };
    }, [authChecked, isPatient]);

    useEffect(() => {
        let isActive = true;

        const loadChatLogs = async () => {
            if (!authChecked || !isAdmin) {
                if (isActive) {
                    setChatLogs([]);
                    setChatLogsError("");
                }
                return;
            }

            setChatLogsLoading(true);
            setChatLogsError("");

            try {
                const res = await fetch("/api/chat-logs", {
                    credentials: "include",
                    cache: "no-store",
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load chat logs.");
                }

                if (isActive) {
                    setChatLogs(data.chatLogs ?? []);
                }
            } catch (error) {
                if (isActive) {
                    setChatLogsError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load chat logs."
                    );
                }
            } finally {
                if (isActive) {
                    setChatLogsLoading(false);
                }
            }
        };

        void loadChatLogs();

        return () => {
            isActive = false;
        };
    }, [authChecked, isAdmin]);

    useEffect(() => {
        let isActive = true;

        const loadEmergencyRequests = async () => {
            if (!authChecked || !canViewStaffData) {
                if (isActive) {
                    setEmergencyRequests([]);
                    setEmergencyError("");
                }
                return;
            }

            setEmergencyLoading(true);
            setEmergencyError("");

            try {
                const res = await fetch("/api/emergency-requests", {
                    credentials: "include",
                    cache: "no-store",
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(
                        data.error || "Failed to load emergency requests."
                    );
                }

                if (isActive) {
                    setEmergencyRequests(data.requests ?? []);
                }
            } catch (error) {
                if (isActive) {
                    setEmergencyError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load emergency requests."
                    );
                }
            } finally {
                if (isActive) {
                    setEmergencyLoading(false);
                }
            }
        };

        void loadEmergencyRequests();

        return () => {
            isActive = false;
        };
    }, [authChecked, canViewStaffData]);

    const analytics = useMemo(
        () => ({
            pending: appointments.filter((item) => item.status === "Pending").length,
            approved: appointments.filter((item) => item.status === "Approved").length,
            high: appointments.filter((item) => item.urgency === "High").length,
            departments: departments.length,
            chatbot: chatLogs.length,
        }),
        [appointments, chatLogs.length]
    );

    const departmentDemand = useMemo(
        () =>
            departments.map((department) => {
                const count = appointments.filter(
                    (item) => item.department === department.name
                ).length;
                const total = appointments.length || 1;

                return {
                    name: department.name,
                    count,
                    percent: Math.round((count / total) * 100),
                };
            }),
        [appointments]
    );

    const doctorAppointments = useMemo(
        () =>
            appointments.filter((item) => {
                const statusMatch =
                    doctorStatusFilter === "All" || item.status === doctorStatusFilter;
                const urgencyMatch =
                    doctorUrgencyFilter === "All" ||
                    item.urgency === doctorUrgencyFilter;
                const departmentMatch =
                    doctorDepartmentFilter === "All" ||
                    item.department === doctorDepartmentFilter;

                return statusMatch && urgencyMatch && departmentMatch;
            }),
        [
            appointments,
            doctorStatusFilter,
            doctorUrgencyFilter,
            doctorDepartmentFilter,
        ]
    );

    const handleSymptomSubmit = async () => {
        if (!symptomText.trim()) {
            return;
        }

        const userMessage = symptomText.trim();

        setMessages((current) => [
            ...current,
            { role: "user", text: userMessage },
            { role: "assistant", text: "Checking your message safely..." },
        ]);
        setSymptomText("");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Chat request failed.");
            }

            const department = departments.find(
                (item) => item.name === data.recommendation.department
            );

            if (department) {
                setRecommendation({
                    department: department.name,
                    consultant: data.recommendation.consultant,
                    specialty: department.specialty,
                });
                setIsUrgentRecommendation(Boolean(data.urgent));
                setAppointment((current) => ({
                    ...current,
                    department: department.name,
                }));
            }

            setMedicalResults(data.trustedInfo ?? []);
            setMedicalDisclaimer(data.disclaimer ?? "");

            setMessages((current) => [
                ...current.slice(0, -1),
                {
                    role: "assistant",
                    text: data.reply,
                    context: {
                        recommendation: data.recommendation,
                        trustedInfo: data.trustedInfo ?? [],
                        bookingPrompt: data.bookingPrompt,
                        disclaimer: data.disclaimer,
                    },
                },
            ]);
        } catch (error) {
            console.error(error);
            setMessages((current) => [
                ...current.slice(0, -1),
                {
                    role: "assistant",
                    text: "Sorry, I could not process that right now. Please try again or contact the hospital directly.",
                },
            ]);
        }
    };

    const handleBooking = async () => {
        if (
            !appointment.name ||
            !appointment.phone ||
            !appointment.date ||
            !appointment.department
        ) {
            setBookingStatus(
                "Please complete all appointment fields before submitting."
            );
            return;
        }

        setBookingStatus("Submitting appointment request...");

        try {
            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...appointment,
                    symptoms:
                        [...messages]
                            .reverse()
                            .find((message) => message.role === "user")?.text ?? "",
                    urgency: isUrgentRecommendation
                        ? "High"
                        : recommendation
                          ? "Medium"
                          : "Low",
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to submit appointment.");
            }

            setBookingStatus(
                isPatient
                    ? "Appointment request submitted and linked to your Patient Portal."
                    : "Appointment request submitted successfully for staff review."
            );
            setAppointment((current) => ({
                ...current,
                date: "",
                department: current.department,
            }));
            setSelectedDate(undefined);
        } catch (error) {
            setBookingStatus(
                error instanceof Error
                    ? error.message
                    : "Failed to submit appointment."
            );
        }
    };

    const updateAppointment = async (
        appointmentId: string,
        payload: Record<string, string | number | null>
    ) => {
        setSavingAppointmentId(appointmentId);

        try {
            const res = await fetch(`/api/appointments/${appointmentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update appointment.");
            }

            setAppointments((current) =>
                current.map((item) =>
                    item.id === appointmentId ? data.appointment : item
                )
            );
            setPatientAppointments((current) =>
                current.map((item) =>
                    item.id === appointmentId ? data.appointment : item
                )
            );
            setSelectedAdminAppointment(data.appointment);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update appointment.";
            setAppointmentsError(message);
            setPatientAppointmentsError(message);
        } finally {
            setSavingAppointmentId(null);
        }
    };

    const handleMedicalLookup = async () => {
        if (!medicalQuery.trim()) {
            setMedicalLookupError("Enter a symptom or condition to search.");
            return;
        }

        setMedicalLookupLoading(true);
        setMedicalLookupError("");

        try {
            const res = await fetch(
                `/api/medical-search?query=${encodeURIComponent(medicalQuery.trim())}`,
                { cache: "no-store" }
            );
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to search medical sources.");
            }

            setMedicalResults(data.results ?? []);
            setMedicalSummary(data.summary ?? "");
            setMedicalDisclaimer(data.disclaimer ?? "");
        } catch (error) {
            setMedicalLookupError(
                error instanceof Error
                    ? error.message
                    : "Failed to search medical sources."
            );
            setMedicalResults([]);
            setMedicalSummary("");
            setMedicalDisclaimer("");
        } finally {
            setMedicalLookupLoading(false);
        }
    };

    const submitEmergencyRequest = async () => {
        if (!navigator.geolocation) {
            setEmergencyStatus("Geolocation is not available in this browser.");
            return;
        }

        setEmergencySubmitting(true);
        setEmergencyStatus("Getting your location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const res = await fetch("/api/emergency-requests", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            patientName:
                                emergencyForm.patientName || appointment.name || null,
                            phone: emergencyForm.phone || appointment.phone || null,
                            notes: emergencyForm.notes || null,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        }),
                    });
                    const data = await res.json();

                    if (!res.ok) {
                        throw new Error(
                            data.error || "Failed to send emergency request."
                        );
                    }

                    setEmergencyStatus(
                        "Emergency request sent to Suwa Setha Hospital emergency unit."
                    );
                    setEmergencyDialogOpen(false);
                    setEmergencyForm({ patientName: "", phone: "", notes: "" });
                    setEmergencyRequests((current) => [data.request, ...current]);
                } catch (error) {
                    setEmergencyStatus(
                        error instanceof Error
                            ? error.message
                            : "Failed to send emergency request."
                    );
                } finally {
                    setEmergencySubmitting(false);
                }
            },
            (error) => {
                setEmergencyStatus(
                    error.message ||
                        "Unable to access your location for the emergency request."
                );
                setEmergencySubmitting(false);
            }
        );
    };

    const updateEmergencyRequest = async (
        requestId: string,
        status: EmergencyRequest["status"]
    ) => {
        setSavingEmergencyId(requestId);

        try {
            const res = await fetch(`/api/emergency-requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update emergency request.");
            }

            setEmergencyRequests((current) =>
                current.map((item) => (item.id === requestId ? data.request : item))
            );
        } catch (error) {
            setEmergencyError(
                error instanceof Error
                    ? error.message
                    : "Failed to update emergency request."
            );
        } finally {
            setSavingEmergencyId(null);
        }
    };

    const openAdminDialog = (item: Appointment) => {
        setSelectedAdminAppointment(item);
        setAdminAssignmentForm({
            status: item.status === "Pending" ? "Approved" : item.status,
            appointmentNumber: item.appointment_number ?? "",
            queueNumber:
                item.queue_number === null || item.queue_number === undefined
                    ? ""
                    : String(item.queue_number),
            currentQueueNumber:
                item.current_queue_number === null ||
                item.current_queue_number === undefined
                    ? ""
                    : String(item.current_queue_number),
            assignedDoctor: item.assigned_doctor ?? "",
            roomNumber: item.room_number ?? "",
            appointmentTime: item.appointment_time ?? "",
            followUpDate: item.follow_up_date ?? "",
            publicPatientNotes: item.public_patient_notes ?? "",
        });
        setAdminDialogOpen(true);
    };

    const submitAdminApproval = async () => {
        if (!selectedAdminAppointment) {
            return;
        }

        await updateAppointment(selectedAdminAppointment.id, {
            status: adminAssignmentForm.status,
            appointmentNumber: adminAssignmentForm.appointmentNumber,
            queueNumber: adminAssignmentForm.queueNumber
                ? Number(adminAssignmentForm.queueNumber)
                : null,
            currentQueueNumber: adminAssignmentForm.currentQueueNumber
                ? Number(adminAssignmentForm.currentQueueNumber)
                : null,
            assignedDoctor: adminAssignmentForm.assignedDoctor,
            roomNumber: adminAssignmentForm.roomNumber,
            appointmentTime: adminAssignmentForm.appointmentTime,
            followUpDate: adminAssignmentForm.followUpDate,
            publicPatientNotes: adminAssignmentForm.publicPatientNotes,
        });
        setAdminDialogOpen(false);
    };

    const submitFeedback = async (item: Appointment) => {
        const draft = feedbackDrafts[item.id];

        if (!draft?.rating) {
            setPatientAppointmentsError("Please choose a feedback rating first.");
            return;
        }

        await updateAppointment(item.id, {
            feedbackRating: Number(draft.rating),
            feedbackComment: draft.comment ?? "",
        });
    };

    const scrollToRef = (ref: React.RefObject<HTMLElement | null>) => {
        window.requestAnimationFrame(() => {
            ref.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    const goToPublicSection = (section: PublicSection) => {
        setActiveTab("patient");
        setActiveNavKey(section);
        setMobileNavOpen(false);

        if (section === "home") {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        if (section === "assistant") {
            scrollToRef(assistantRef);
            return;
        }

        if (section === "appointments") {
            scrollToRef(appointmentRef);
            return;
        }

        setEmergencyDialogOpen(true);
    };

    const handleLogout = async () => {
        await supabaseClient.auth.signOut();
        setMobileNavOpen(false);
        setCurrentUser(null);
        setCurrentRole(null);
        setAuthStatusMessage("");
        setIsLoadingAuth(false);
        routeToRoleHome(null);
    };

    const handleNavigationAction = (key: NavKey | "login" | "logout") => {
        if (key === "logout") {
            void handleLogout();
            return;
        }

        if (key === "login") {
            setAuthDialogOpen(true);
            setMobileNavOpen(false);
            return;
        }

        if (
            key === "home" ||
            key === "assistant" ||
            key === "appointments" ||
            key === "emergency"
        ) {
            goToPublicSection(key);
            return;
        }

        if (key === "portal" || key === "my-appointments") {
            setActiveTab("portal");
            setActiveNavKey(key);
            setMobileNavOpen(false);

            if (key === "my-appointments") {
                scrollToRef(patientPortalRef);
            }

            return;
        }

        if (key === "doctor-dashboard" || key === "doctor-appointments") {
            setActiveTab("doctor");
            setActiveNavKey(key);
            setMobileNavOpen(false);

            if (key === "doctor-appointments") {
                scrollToRef(doctorAppointmentsRef);
            }

            return;
        }

        setActiveTab("admin");
        setActiveNavKey(key);
        setMobileNavOpen(false);

        if (key === "emergency-requests") {
            scrollToRef(adminEmergencyRef);
            return;
        }

        if (key === "analytics") {
            scrollToRef(adminAnalyticsRef);
        }
    };

    const navigationItems: Array<{
        key: NavKey | "login" | "logout";
        label: string;
        icon: React.ElementType;
        isActive: boolean;
    }> = isAdmin
        ? [
              {
                  key: "admin-dashboard",
                  label: "Admin Dashboard",
                  icon: LayoutDashboard,
                  isActive: activeTab === "admin" && activeNavKey === "admin-dashboard",
              },
              {
                  key: "emergency-requests",
                  label: "Emergency Requests",
                  icon: PhoneCall,
                  isActive:
                      activeTab === "admin" && activeNavKey === "emergency-requests",
              },
              {
                  key: "analytics",
                  label: "Analytics",
                  icon: Activity,
                  isActive: activeTab === "admin" && activeNavKey === "analytics",
              },
              {
                  key: "logout",
                  label: "Logout",
                  icon: LogOut,
                  isActive: false,
              },
          ]
        : isDoctor
          ? [
                {
                    key: "doctor-dashboard",
                    label: "Doctor Dashboard",
                    icon: Stethoscope,
                    isActive:
                        activeTab === "doctor" && activeNavKey === "doctor-dashboard",
                },
                {
                    key: "doctor-appointments",
                    label: "Appointments",
                    icon: ClipboardList,
                    isActive:
                        activeTab === "doctor" && activeNavKey === "doctor-appointments",
                },
                {
                    key: "logout",
                    label: "Logout",
                    icon: LogOut,
                    isActive: false,
                },
            ]
          : isPatient
            ? [
                  {
                      key: "portal",
                      label: "Patient Portal",
                      icon: UserRound,
                      isActive: activeTab === "portal" && activeNavKey === "portal",
                  },
                  {
                      key: "my-appointments",
                      label: "My Appointments",
                      icon: CalendarIcon,
                      isActive:
                          activeTab === "portal" &&
                          activeNavKey === "my-appointments",
                  },
                  {
                      key: "emergency",
                      label: "Emergency",
                      icon: PhoneCall,
                      isActive: activeNavKey === "emergency",
                  },
                  {
                      key: "logout",
                      label: "Logout",
                      icon: LogOut,
                      isActive: false,
                  },
              ]
            : isAuthenticated
              ? [
                    {
                        key: "home",
                        label: "Home",
                        icon: Hospital,
                        isActive: activeTab === "patient" && activeNavKey === "home",
                    },
                    {
                        key: "assistant",
                        label: "AI Assistant",
                        icon: MessageCircle,
                        isActive:
                            activeTab === "patient" && activeNavKey === "assistant",
                    },
                    {
                        key: "appointments",
                        label: "Book Appointment",
                        icon: CalendarIcon,
                        isActive:
                            activeTab === "patient" &&
                            activeNavKey === "appointments",
                    },
                    {
                        key: "emergency",
                        label: "Emergency",
                        icon: PhoneCall,
                        isActive: activeNavKey === "emergency",
                    },
                    {
                        key: "logout",
                        label: "Logout",
                        icon: LogOut,
                        isActive: false,
                    },
                ]
              : [
                  {
                      key: "home",
                      label: "Home",
                      icon: Hospital,
                      isActive: activeTab === "patient" && activeNavKey === "home",
                  },
                  {
                      key: "assistant",
                      label: "AI Assistant",
                      icon: MessageCircle,
                      isActive:
                          activeTab === "patient" && activeNavKey === "assistant",
                  },
                  {
                      key: "appointments",
                      label: "Book Appointment",
                      icon: CalendarIcon,
                      isActive:
                          activeTab === "patient" && activeNavKey === "appointments",
                  },
                  {
                      key: "emergency",
                      label: "Emergency",
                      icon: PhoneCall,
                      isActive: activeNavKey === "emergency",
                  },
                  {
                      key: "login",
                      label: "Login",
                      icon: ShieldCheck,
                      isActive: false,
                  },
              ];

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#edf6fb_28%,#f8fafc_100%)] text-slate-900">
            <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => goToPublicSection("home")}
                    >
                        <div className="rounded-3xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-950/10">
                            <Hospital className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-sky-700">
                                Suwa Setha Hospital
                            </p>
                            <h1 className="font-heading text-xl font-semibold text-slate-950">
                                AI Healthcare Assistant
                            </h1>
                        </div>
                    </button>

                    <nav
                        aria-label="Primary navigation"
                        className="hidden items-center gap-2 lg:flex"
                    >
                        {navigationItems.map((item) => (
                            <Button
                                key={item.key}
                                variant={item.isActive ? "default" : "outline"}
                                className="min-h-11 rounded-full px-4"
                                aria-current={item.isActive ? "page" : undefined}
                                onClick={() => handleNavigationAction(item.key)}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        {isAuthenticated && currentRole ? (
                            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm md:flex">
                                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                                <span className="font-medium capitalize text-slate-700">
                                    {currentRole}
                                </span>
                            </div>
                        ) : null}

                        <Button
                            type="button"
                            variant="outline"
                            size="icon-lg"
                            className="rounded-full lg:hidden"
                            aria-label="Open navigation menu"
                            onClick={() => setMobileNavOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <AuthDialog
                open={authDialogOpen}
                onOpenChange={setAuthDialogOpen}
                onAuthSuccess={syncAuthState}
            />

            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <DialogContent
                    className="left-auto right-0 top-0 h-screen w-[min(92vw,24rem)] max-w-none translate-x-0 translate-y-0 rounded-none border-l border-slate-200"
                    showClose={false}
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>Mobile navigation</DialogTitle>
                        <DialogDescription>
                            Browse sections of the Suwa Setha hospital platform.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-sky-700">
                                Navigation
                            </p>
                            <p className="mt-1 font-semibold text-slate-950">
                                Quick access
                            </p>
                        </div>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-lg"
                                className="rounded-full"
                                aria-label="Close navigation menu"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                    </div>
                    <nav
                        aria-label="Mobile navigation"
                        className="flex flex-col gap-3 px-6 py-6"
                    >
                        {navigationItems.map((item) => (
                            <Button
                                key={item.key}
                                variant={item.isActive ? "default" : "outline"}
                                className="min-h-12 justify-start rounded-2xl px-4 text-sm"
                                aria-current={item.isActive ? "page" : undefined}
                                onClick={() => handleNavigationAction(item.key)}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        ))}
                    </nav>
                </DialogContent>
            </Dialog>

            <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Emergency Service Request</DialogTitle>
                        <DialogDescription>
                            This prototype can record an emergency request for the
                            hospital team, but it is not a replacement for calling
                            local emergency services.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 px-6 pb-6">
                        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 ring-1 ring-rose-100">
                            For life-threatening emergencies, contact local emergency
                            services immediately.
                        </div>
                        <Input
                            placeholder="Patient name (optional)"
                            value={emergencyForm.patientName}
                            onChange={(event) =>
                                setEmergencyForm((current) => ({
                                    ...current,
                                    patientName: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Input
                            placeholder="Phone number (optional)"
                            value={emergencyForm.phone}
                            onChange={(event) =>
                                setEmergencyForm((current) => ({
                                    ...current,
                                    phone: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Textarea
                            placeholder="Notes for the emergency team (optional)"
                            value={emergencyForm.notes}
                            onChange={(event) =>
                                setEmergencyForm((current) => ({
                                    ...current,
                                    notes: event.target.value,
                                }))
                            }
                            className="min-h-24 rounded-2xl bg-white"
                        />
                        <Button
                            className="w-full rounded-2xl"
                            disabled={emergencySubmitting}
                            onClick={() => void submitEmergencyRequest()}
                        >
                            {emergencySubmitting ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <PhoneCall className="mr-2 h-4 w-4" />
                            )}
                            Send emergency request
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Approve and Assign Appointment</DialogTitle>
                        <DialogDescription>
                            Assign queue and clinic details when approving a patient
                            request, or update the same details later during staff
                            operations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                        <select
                            value={adminAssignmentForm.status}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    status: event.target.value,
                                }))
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none md:col-span-2"
                        >
                            {[
                                "Approved",
                                "In Progress",
                                "Completed",
                                "Cancelled",
                                "Rejected",
                            ].map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        <Input
                            placeholder="Appointment number"
                            value={adminAssignmentForm.appointmentNumber}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    appointmentNumber: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Input
                            placeholder="Assigned doctor"
                            value={adminAssignmentForm.assignedDoctor}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    assignedDoctor: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Input
                            placeholder="Queue number"
                            value={adminAssignmentForm.queueNumber}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    queueNumber: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Input
                            placeholder="Current queue number"
                            value={adminAssignmentForm.currentQueueNumber}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    currentQueueNumber: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Input
                            placeholder="Room number"
                            value={adminAssignmentForm.roomNumber}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    roomNumber: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Input
                            placeholder="Appointment time"
                            value={adminAssignmentForm.appointmentTime}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    appointmentTime: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white"
                        />
                        <Input
                            type="date"
                            value={adminAssignmentForm.followUpDate}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    followUpDate: event.target.value,
                                }))
                            }
                            className="rounded-2xl bg-white md:col-span-2"
                        />
                        <Textarea
                            placeholder="Public instructions or patient-facing notes"
                            value={adminAssignmentForm.publicPatientNotes}
                            onChange={(event) =>
                                setAdminAssignmentForm((current) => ({
                                    ...current,
                                    publicPatientNotes: event.target.value,
                                }))
                            }
                            className="min-h-28 rounded-2xl bg-white md:col-span-2"
                        />
                        <Button
                            className="rounded-2xl md:col-span-2"
                            disabled={
                                !selectedAdminAppointment ||
                                savingAppointmentId === selectedAdminAppointment.id
                            }
                            onClick={() => void submitAdminApproval()}
                        >
                            {savingAppointmentId &&
                            selectedAdminAppointment &&
                            savingAppointmentId === selectedAdminAppointment.id ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Save appointment assignment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-8"
                >
                    {authStatusMessage ? (
                        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 shadow-sm">
                            {authStatusMessage}
                        </div>
                    ) : null}

                    {emergencyStatus ? (
                        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
                            {emergencyStatus}
                        </div>
                    ) : null}

                    {activeTab === "patient" ? (
                        <>
                            <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#ffffff_38%,#f8fafc_100%)] shadow-[0_30px_80px_-45px_rgba(14,116,144,0.35)]">
                                <div className="grid gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-12">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-700 ring-1 ring-sky-100">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Smart hospital operations
                                        </div>
                                        <h2 className="mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                                            Get guided support, request appointments, and
                                            track care through one connected hospital
                                            platform.
                                        </h2>
                                        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                                            Suwa Assist combines safe patient guidance,
                                            trusted health education, optional patient
                                            portal access, and staff scheduling workflows.
                                            Public appointment booking still works without an
                                            account, and the assistant never provides a
                                            medical diagnosis.
                                        </p>
                                        <div className="mt-8 flex flex-wrap gap-3">
                                            <Button
                                                size="lg"
                                                className="rounded-full px-5"
                                                onClick={() => goToPublicSection("assistant")}
                                            >
                                                Start with AI Assistant
                                            </Button>
                                            <Button
                                                size="lg"
                                                variant="outline"
                                                className="rounded-full px-5"
                                                onClick={() =>
                                                    goToPublicSection("appointments")
                                                }
                                            >
                                                Book Appointment
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                        <StatCard
                                            icon={ShieldCheck}
                                            label="AI safety"
                                            value="No diagnosis"
                                            sub="Educational support only"
                                        />
                                        <StatCard
                                            icon={CalendarIcon}
                                            label="Appointments"
                                            value="Public or linked"
                                            sub="Optional patient account"
                                        />
                                        <StatCard
                                            icon={MapPinned}
                                            label="Emergency"
                                            value="Prototype request"
                                            sub="Not a dispatch replacement"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                                <div className="space-y-6">
                                    <div ref={assistantRef}>
                                        <Card
                                            id="assistant-card"
                                            className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]"
                                        >
                                            <CardContent className="p-6 sm:p-8">
                                            <SectionHeading
                                                icon={MessageCircle}
                                                title="AI Assistant"
                                                description="Describe symptoms in simple language. The assistant responds safely, suggests a department and consultant, and adds trusted medical education cards when available."
                                            />

                                            <div className="mt-6 h-[420px] space-y-4 overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                                                {messages.map((message, index) => {
                                                    const isUserMessage =
                                                        message.role === "user";

                                                    return (
                                                        <div
                                                            key={`${message.role}-${index}`}
                                                            className={`flex ${
                                                                isUserMessage
                                                                    ? "justify-end"
                                                                    : "justify-start"
                                                            }`}
                                                        >
                                                            <div
                                                                className={`max-w-[92%] rounded-[1.5rem] px-4 py-3 text-sm leading-7 sm:max-w-[85%] ${
                                                                    isUserMessage
                                                                        ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                                                                        : "border border-slate-200 bg-white text-slate-800"
                                                                }`}
                                                            >
                                                                <p>{message.text}</p>

                                                                {!isUserMessage &&
                                                                message.context?.recommendation ? (
                                                                    <div className="mt-4 space-y-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-[0.24em] text-sky-700">
                                                                                    Suggested department
                                                                                </p>
                                                                                <p className="mt-1 font-semibold text-slate-900">
                                                                                    {
                                                                                        message
                                                                                            .context
                                                                                            .recommendation
                                                                                            .department
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-[0.24em] text-sky-700">
                                                                                    Recommended consultant
                                                                                </p>
                                                                                <p className="mt-1 font-semibold text-slate-900">
                                                                                    {
                                                                                        message
                                                                                            .context
                                                                                            .recommendation
                                                                                            .consultant
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            className="rounded-full"
                                                                            onClick={() =>
                                                                                appointmentRef.current?.scrollIntoView(
                                                                                    {
                                                                                        behavior:
                                                                                            "smooth",
                                                                                        block: "start",
                                                                                    }
                                                                                )
                                                                            }
                                                                        >
                                                                            Book appointment
                                                                        </Button>
                                                                    </div>
                                                                ) : null}

                                                                {!isUserMessage &&
                                                                message.context?.trustedInfo?.length ? (
                                                                    <div className="mt-4 space-y-3">
                                                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                                                                            Trusted information
                                                                        </p>
                                                                        {message.context.trustedInfo.map(
                                                                            (item) => (
                                                                                <div
                                                                                    key={`${item.source}-${item.title}`}
                                                                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                                                                >
                                                                                    <div className="flex items-center justify-between gap-3">
                                                                                        <p className="font-semibold text-slate-900">
                                                                                            {item.title}
                                                                                        </p>
                                                                                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                                                                                            {item.source}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                                                        {item.summary}
                                                                                    </p>
                                                                                    <a
                                                                                        href={item.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900"
                                                                                    >
                                                                                        Read more
                                                                                        <ArrowRight className="h-4 w-4" />
                                                                                    </a>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                ) : null}

                                                                {!isUserMessage &&
                                                                message.context?.disclaimer ? (
                                                                    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800 ring-1 ring-amber-100">
                                                                        {
                                                                            message.context
                                                                                .disclaimer
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                                <Input
                                                    value={symptomText}
                                                    onChange={(event) =>
                                                        setSymptomText(event.target.value)
                                                    }
                                                    placeholder="Example: I have fever and body pain for two days."
                                                    className="rounded-2xl bg-white"
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") {
                                                            void handleSymptomSubmit();
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    className="rounded-2xl px-5"
                                                    onClick={() => void handleSymptomSubmit()}
                                                >
                                                    Send
                                                </Button>
                                            </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div ref={appointmentRef}>
                                        <Card className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
                                            <CardContent className="p-6 sm:p-8">
                                            <SectionHeading
                                                icon={CalendarIcon}
                                                title="Appointment Booking"
                                                description="Patients can request appointments directly from the assistant recommendation or manually choose a department. Logged-in patients automatically link requests to the portal."
                                            />

                                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                                <Input
                                                    placeholder="Patient name"
                                                    value={appointment.name}
                                                    onChange={(event) =>
                                                        setAppointment((current) => ({
                                                            ...current,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                    className="rounded-2xl bg-white"
                                                />
                                                <Input
                                                    placeholder="Phone number"
                                                    value={appointment.phone}
                                                    onChange={(event) =>
                                                        setAppointment((current) => ({
                                                            ...current,
                                                            phone: event.target.value,
                                                        }))
                                                    }
                                                    className="rounded-2xl bg-white"
                                                />
                                                <DatePicker
                                                    value={selectedDate}
                                                    onChange={(day) => {
                                                        setSelectedDate(day);
                                                        setAppointment((current) => ({
                                                            ...current,
                                                            date: toDateInputValue(day),
                                                        }));
                                                    }}
                                                />
                                                <DepartmentCombobox
                                                    value={appointment.department}
                                                    onChange={(value) =>
                                                        setAppointment((current) => ({
                                                            ...current,
                                                            department: value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
                                                    Patients do not need accounts for booking,
                                                    but logged-in patients can track requests in
                                                    the portal.
                                                </div>
                                                <Button
                                                    className="rounded-2xl px-5"
                                                    onClick={() => void handleBooking()}
                                                >
                                                    Submit appointment request
                                                </Button>
                                            </div>

                                            {bookingStatus ? (
                                                <p className="mt-4 text-sm text-slate-600">
                                                    {bookingStatus}
                                                </p>
                                            ) : null}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <Card className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
                                        <CardContent className="p-6 sm:p-8">
                                            <SectionHeading
                                                icon={HeartPulse}
                                                title="Browse Consultants"
                                                description="Review specialties and consultants while keeping final clinical decisions with medical professionals."
                                            />
                                            <div className="mt-6 space-y-3">
                                                {departments.map((department) => (
                                                    <div
                                                        key={department.id}
                                                        className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4"
                                                    >
                                                        <p className="font-semibold text-slate-900">
                                                            {department.name}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {department.consultant}
                                                        </p>
                                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                                            {department.specialty}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
                                        <CardContent className="p-6 sm:p-8">
                                            <SectionHeading
                                                icon={Search}
                                                title="Health Information"
                                                description="Search trusted MedlinePlus and NIH resources for patient education. Results are summarised safely and never used to diagnose."
                                            />

                                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                                <Input
                                                    value={medicalQuery}
                                                    onChange={(event) =>
                                                        setMedicalQuery(event.target.value)
                                                    }
                                                    placeholder="Search: asthma, fever, chest pain, diabetes"
                                                    className="rounded-2xl bg-white"
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") {
                                                            void handleMedicalLookup();
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    variant="outline"
                                                    className="rounded-2xl px-5"
                                                    onClick={() => void handleMedicalLookup()}
                                                >
                                                    {medicalLookupLoading ? (
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        "Lookup"
                                                    )}
                                                </Button>
                                            </div>

                                            {medicalLookupError ? (
                                                <p className="mt-4 text-sm text-rose-600">
                                                    {medicalLookupError}
                                                </p>
                                            ) : null}

                                            {medicalSummary ? (
                                                <div className="mt-5 rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-100">
                                                    <p className="text-xs uppercase tracking-[0.24em] text-sky-700">
                                                        AI educational summary
                                                    </p>
                                                    <p className="mt-2 text-sm leading-7 text-slate-700">
                                                        {medicalSummary}
                                                    </p>
                                                </div>
                                            ) : null}

                                            <div className="mt-5 space-y-3">
                                                {medicalResults.length ? (
                                                    medicalResults.map((result) => (
                                                        <div
                                                            key={`${result.source}-${result.title}`}
                                                            className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4"
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="font-semibold text-slate-900">
                                                                    {result.title}
                                                                </p>
                                                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                                                                    {result.source}
                                                                </span>
                                                            </div>
                                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                                {result.summary}
                                                            </p>
                                                            <a
                                                                href={result.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900"
                                                            >
                                                                Read more
                                                                <ArrowRight className="h-4 w-4" />
                                                            </a>
                                                        </div>
                                                    ))
                                                ) : medicalQuery && !medicalLookupLoading ? (
                                                    <EmptyState
                                                        title="No trusted results found"
                                                        description="Try a broader symptom or condition name to search MedlinePlus and NIH educational topics."
                                                    />
                                                ) : (
                                                    <EmptyState
                                                        title="Search trusted health resources"
                                                        description="Use the lookup to view short, readable education cards from trusted medical sources."
                                                    />
                                                )}
                                            </div>

                                            {medicalDisclaimer ? (
                                                <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800 ring-1 ring-amber-100">
                                                    {medicalDisclaimer}
                                                </p>
                                            ) : null}
                                        </CardContent>
                                    </Card>
                                </div>
                            </section>
                        </>
                    ) : null}

                    {activeTab === "portal" ? (
                        !isAuthenticated ? (
                            <DashboardGate
                                title="Patient login required"
                                description="Log in or create an optional patient account to view your appointment tracking details, queue updates, and post-visit feedback."
                            />
                        ) : !isPatient ? (
                            <DashboardGate
                                title="Patient access required"
                                description="The Patient Portal is intended for patient accounts. Staff can continue to the doctor or admin dashboards."
                            />
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <StatCard
                                        icon={ClipboardList}
                                        label="My appointments"
                                        value={patientAppointments.length}
                                        sub="Linked to your account"
                                    />
                                    <StatCard
                                        icon={CalendarIcon}
                                        label="Approved"
                                        value={
                                            patientAppointments.filter(
                                                (item) =>
                                                    item.status === "Approved" ||
                                                    item.status === "In Progress"
                                            ).length
                                        }
                                        sub="Upcoming or live visits"
                                    />
                                    <StatCard
                                        icon={BadgeCheck}
                                        label="Completed"
                                        value={
                                            patientAppointments.filter(
                                                (item) => item.status === "Completed"
                                            ).length
                                        }
                                        sub="Feedback available"
                                    />
                                </div>

                                <div ref={patientPortalRef}>
                                    <Card className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
                                        <CardContent className="p-6 sm:p-8">
                                        <SectionHeading
                                            icon={UserRound}
                                            title="Patient Portal"
                                            description="Track appointment numbers, clinic details, live queue updates, follow-up dates, and visible patient notes once staff approve your request."
                                        />

                                        {patientAppointmentsError ? (
                                            <p className="mt-4 text-sm text-rose-600">
                                                {patientAppointmentsError}
                                            </p>
                                        ) : null}

                                        {patientAppointmentsLoading ? (
                                            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                Loading your appointments...
                                            </div>
                                        ) : patientAppointments.length ? (
                                            <div className="mt-6 space-y-5">
                                                {patientAppointments.map((item) => {
                                                    const feedback =
                                                        feedbackDrafts[item.id] ?? {
                                                            rating: item.feedback_rating
                                                                ? String(
                                                                      item.feedback_rating
                                                                  )
                                                                : "",
                                                            comment:
                                                                item.feedback_comment ??
                                                                "",
                                                        };

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5"
                                                        >
                                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="text-lg font-semibold text-slate-950">
                                                                            {item.department}
                                                                        </p>
                                                                        <span
                                                                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(
                                                                                item.status
                                                                            )}`}
                                                                        >
                                                                            {item.status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-2 text-sm text-slate-500">
                                                                        Appointment number:{" "}
                                                                        {item.appointment_number ||
                                                                            "Awaiting staff assignment"}
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200">
                                                                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                                        Date
                                                                    </p>
                                                                    <p className="mt-1 font-medium text-slate-900">
                                                                        {formatAppointmentDate(
                                                                            item.appointment_date
                                                                        )}{" "}
                                                                        {item.appointment_time
                                                                            ? `• ${item.appointment_time}`
                                                                            : ""}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                                <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                                                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                                        Doctor
                                                                    </p>
                                                                    <p className="mt-2 font-semibold text-slate-900">
                                                                        {item.assigned_doctor ||
                                                                            "Pending assignment"}
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                                                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                                        Room
                                                                    </p>
                                                                    <p className="mt-2 font-semibold text-slate-900">
                                                                        {item.room_number ||
                                                                            "Pending assignment"}
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                                                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                                        Follow-up clinic
                                                                    </p>
                                                                    <p className="mt-2 font-semibold text-slate-900">
                                                                        {item.follow_up_date
                                                                            ? formatAppointmentDate(
                                                                                  item.follow_up_date
                                                                              )
                                                                            : "Not scheduled"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {isToday(item.appointment_date) &&
                                                            (item.queue_number !== null ||
                                                                item.current_queue_number !==
                                                                    null) ? (
                                                                <div className="mt-4 rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-100">
                                                                    <p className="text-xs uppercase tracking-[0.24em] text-sky-700">
                                                                        Today&apos;s queue
                                                                    </p>
                                                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                                        <div>
                                                                            <p className="text-sm text-slate-500">
                                                                                Your queue number
                                                                            </p>
                                                                            <p className="text-xl font-semibold text-slate-950">
                                                                                {item.queue_number ??
                                                                                    "Pending"}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm text-slate-500">
                                                                                Current number
                                                                            </p>
                                                                            <p className="text-xl font-semibold text-slate-950">
                                                                                {item.current_queue_number ??
                                                                                    "Pending"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : null}

                                                            {item.public_patient_notes ? (
                                                                <div className="mt-4 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                                                                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">
                                                                        Patient instructions
                                                                    </p>
                                                                    <p className="mt-2 text-sm leading-7 text-slate-700">
                                                                        {
                                                                            item.public_patient_notes
                                                                        }
                                                                    </p>
                                                                </div>
                                                            ) : null}

                                                            {item.status === "Completed" ? (
                                                                <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                                                    <p className="text-sm font-semibold text-slate-900">
                                                                        Share feedback
                                                                    </p>
                                                                    <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
                                                                        <select
                                                                            value={feedback.rating}
                                                                            onChange={(event) =>
                                                                                setFeedbackDrafts(
                                                                                    (
                                                                                        current
                                                                                    ) => ({
                                                                                        ...current,
                                                                                        [item.id]:
                                                                                            {
                                                                                                ...feedback,
                                                                                                rating:
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                            },
                                                                                    })
                                                                                )
                                                                            }
                                                                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
                                                                        >
                                                                            <option value="">
                                                                                Rating
                                                                            </option>
                                                                            {[1, 2, 3, 4, 5].map(
                                                                                (value) => (
                                                                                    <option
                                                                                        key={value}
                                                                                        value={value}
                                                                                    >
                                                                                        {value} / 5
                                                                                    </option>
                                                                                )
                                                                            )}
                                                                        </select>
                                                                        <Textarea
                                                                            value={feedback.comment}
                                                                            onChange={(event) =>
                                                                                setFeedbackDrafts(
                                                                                    (
                                                                                        current
                                                                                    ) => ({
                                                                                        ...current,
                                                                                        [item.id]:
                                                                                            {
                                                                                                ...feedback,
                                                                                                comment:
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                            },
                                                                                    })
                                                                                )
                                                                            }
                                                                            placeholder="Tell us about your visit."
                                                                            className="min-h-24 rounded-2xl bg-slate-50"
                                                                        />
                                                                    </div>
                                                                    <div className="mt-3 flex justify-end">
                                                                        <Button
                                                                            variant="outline"
                                                                            className="rounded-2xl"
                                                                            disabled={
                                                                                savingAppointmentId ===
                                                                                item.id
                                                                            }
                                                                            onClick={() =>
                                                                                void submitFeedback(
                                                                                    item
                                                                                )
                                                                            }
                                                                        >
                                                                            {savingAppointmentId ===
                                                                            item.id ? (
                                                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                                            ) : null}
                                                                            Save feedback
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="mt-6">
                                                <EmptyState
                                                    title="No linked appointments yet"
                                                    description="Book a public appointment while signed in to have it appear automatically in your Patient Portal."
                                                />
                                            </div>
                                        )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )
                    ) : null}

                    {activeTab === "doctor" ? (
                        !isAuthenticated ? (
                            <DashboardGate
                                title="Doctor login required"
                                description="Doctor dashboards are restricted to authenticated staff. Use the unified login button in the header to sign in."
                            />
                        ) : !isDoctor && !isAdmin ? (
                            <DashboardGate
                                title="Doctor access required"
                                description="This dashboard is reserved for doctor or admin roles from the Supabase profiles table."
                            />
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <StatCard
                                        icon={ClipboardList}
                                        label="Appointments"
                                        value={doctorAppointments.length}
                                        sub="Visible in current filter"
                                    />
                                    <StatCard
                                        icon={AlertTriangle}
                                        label="High priority"
                                        value={appointments.filter(
                                            (item) => item.urgency === "High"
                                        ).length}
                                        sub="Needs urgent review"
                                    />
                                    <StatCard
                                        icon={Activity}
                                        label="In progress"
                                        value={
                                            appointments.filter(
                                                (item) => item.status === "In Progress"
                                            ).length
                                        }
                                        sub="Active clinic visits"
                                    />
                                </div>

                                <div ref={doctorAppointmentsRef}>
                                    <Card className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
                                        <CardContent className="p-6 sm:p-8">
                                        <SectionHeading
                                            icon={Stethoscope}
                                            title="Doctor Dashboard"
                                            description="Review appointments, filter by urgency, status, or department, and maintain both internal staff notes and optional public notes for patients."
                                        />

                                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                                            <select
                                                value={doctorUrgencyFilter}
                                                onChange={(event) =>
                                                    setDoctorUrgencyFilter(
                                                        event.target.value
                                                    )
                                                }
                                                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
                                            >
                                                <option value="All">All urgency</option>
                                                <option value="High">High urgency</option>
                                                <option value="Medium">Medium urgency</option>
                                                <option value="Low">Low urgency</option>
                                            </select>
                                            <select
                                                value={doctorStatusFilter}
                                                onChange={(event) =>
                                                    setDoctorStatusFilter(
                                                        event.target.value
                                                    )
                                                }
                                                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
                                            >
                                                <option value="All">All statuses</option>
                                                {[
                                                    "Pending",
                                                    "Approved",
                                                    "In Progress",
                                                    "Completed",
                                                    "Rejected",
                                                    "Cancelled",
                                                ].map((status) => (
                                                    <option key={status} value={status}>
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={doctorDepartmentFilter}
                                                onChange={(event) =>
                                                    setDoctorDepartmentFilter(
                                                        event.target.value
                                                    )
                                                }
                                                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
                                            >
                                                <option value="All">All departments</option>
                                                {departments.map((department) => (
                                                    <option
                                                        key={department.id}
                                                        value={department.name}
                                                    >
                                                        {department.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {appointmentsError ? (
                                            <p className="mt-4 text-sm text-rose-600">
                                                {appointmentsError}
                                            </p>
                                        ) : null}

                                        {appointmentsLoading ? (
                                            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                Loading appointments...
                                            </div>
                                        ) : doctorAppointments.length ? (
                                            <div className="mt-6 space-y-5">
                                                {doctorAppointments.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5"
                                                    >
                                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="text-lg font-semibold text-slate-950">
                                                                        {item.patient_name}
                                                                    </p>
                                                                    <span
                                                                        className={`rounded-full px-3 py-1 text-xs font-medium ${getUrgencyTone(
                                                                            item.urgency
                                                                        )}`}
                                                                    >
                                                                        {item.urgency} urgency
                                                                    </span>
                                                                    <span
                                                                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(
                                                                            item.status
                                                                        )}`}
                                                                    >
                                                                        {item.status}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-2 text-sm text-slate-500">
                                                                    {item.department} •{" "}
                                                                    {formatAppointmentDate(
                                                                        item.appointment_date
                                                                    )}{" "}
                                                                    {item.appointment_time
                                                                        ? `• ${item.appointment_time}`
                                                                        : ""}{" "}
                                                                    • {item.phone}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="rounded-full"
                                                                    disabled={
                                                                        savingAppointmentId ===
                                                                        item.id
                                                                    }
                                                                    onClick={() =>
                                                                        void updateAppointment(
                                                                            item.id,
                                                                            {
                                                                                status:
                                                                                    "In Progress",
                                                                            }
                                                                        )
                                                                    }
                                                                >
                                                                    Mark In Progress
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="rounded-full"
                                                                    disabled={
                                                                        savingAppointmentId ===
                                                                        item.id
                                                                    }
                                                                    onClick={() =>
                                                                        void updateAppointment(
                                                                            item.id,
                                                                            {
                                                                                status:
                                                                                    "Completed",
                                                                            }
                                                                        )
                                                                    }
                                                                >
                                                                    Mark Completed
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                                                            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                                    AI patient summary
                                                                </p>
                                                                <p className="mt-3 text-sm leading-7 text-slate-700">
                                                                    {buildAiPatientSummary(item)}
                                                                </p>
                                                            </div>

                                                            <div className="grid gap-4">
                                                                <div className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                                                    <label className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                                        Internal staff notes
                                                                    </label>
                                                                    <Textarea
                                                                        value={
                                                                            noteDrafts[item.id] ??
                                                                            ""
                                                                        }
                                                                        onChange={(event) =>
                                                                            setNoteDrafts(
                                                                                (
                                                                                    current
                                                                                ) => ({
                                                                                    ...current,
                                                                                    [item.id]:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        placeholder="Internal clinical notes and preparation details."
                                                                        className="min-h-24 rounded-2xl bg-slate-50"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                                                    <label className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                                        Public patient notes
                                                                    </label>
                                                                    <Textarea
                                                                        value={
                                                                            publicNoteDrafts[
                                                                                item.id
                                                                            ] ?? ""
                                                                        }
                                                                        onChange={(event) =>
                                                                            setPublicNoteDrafts(
                                                                                (
                                                                                    current
                                                                                ) => ({
                                                                                    ...current,
                                                                                    [item.id]:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        placeholder="Optional instructions visible to the patient."
                                                                        className="min-h-24 rounded-2xl bg-slate-50"
                                                                    />
                                                                </div>
                                                                <div className="flex justify-end">
                                                                    <Button
                                                                        variant="outline"
                                                                        className="rounded-2xl"
                                                                        disabled={
                                                                            savingAppointmentId ===
                                                                            item.id
                                                                        }
                                                                        onClick={() =>
                                                                            void updateAppointment(
                                                                                item.id,
                                                                                {
                                                                                    internalStaffNotes:
                                                                                        noteDrafts[
                                                                                            item.id
                                                                                        ] ??
                                                                                        "",
                                                                                    publicPatientNotes:
                                                                                        publicNoteDrafts[
                                                                                            item.id
                                                                                        ] ??
                                                                                        "",
                                                                                }
                                                                            )
                                                                        }
                                                                    >
                                                                        {savingAppointmentId ===
                                                                        item.id ? (
                                                                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                                        ) : null}
                                                                        Save notes
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mt-6">
                                                <EmptyState
                                                    title="No appointments match the current filters"
                                                    description="Try clearing one or more filters to view more appointments."
                                                />
                                            </div>
                                        )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )
                    ) : null}

                    {activeTab === "admin" ? (
                        !isAuthenticated ? (
                            <DashboardGate
                                title="Admin login required"
                                description="Administrative dashboards are restricted to authenticated staff. Use the unified login button in the header to continue."
                            />
                        ) : !isAdmin ? (
                            <DashboardGate
                                title="Admin access required"
                                description="This dashboard is reserved for admin roles from the Supabase profiles table."
                            />
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-4">
                                    <StatCard
                                        icon={CalendarIcon}
                                        label="Pending requests"
                                        value={analytics.pending}
                                        sub="Waiting for review"
                                    />
                                    <StatCard
                                        icon={AlertTriangle}
                                        label="High priority"
                                        value={analytics.high}
                                        sub="Flagged by triage rules"
                                    />
                                    <StatCard
                                        icon={Users}
                                        label="Departments"
                                        value={analytics.departments}
                                        sub="Configured for booking"
                                    />
                                    <StatCard
                                        icon={MessageCircle}
                                        label="Recent chats"
                                        value={analytics.chatbot}
                                        sub="Saved conversation logs"
                                    />
                                </div>

                                <div ref={adminAnalyticsRef}>
                                    <Card className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
                                        <CardContent className="p-6 sm:p-8">
                                        <SectionHeading
                                            icon={LayoutDashboard}
                                            title="Admin Operations Dashboard"
                                            description="Approve public or linked appointment requests, assign clinic details, monitor queue progress, and review emergency requests alongside recent assistant activity."
                                        />

                                        {appointmentsError ? (
                                            <p className="mt-4 text-sm text-rose-600">
                                                {appointmentsError}
                                            </p>
                                        ) : null}
                                        {emergencyError ? (
                                            <p className="mt-2 text-sm text-rose-600">
                                                {emergencyError}
                                            </p>
                                        ) : null}

                                        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                                            <div className="space-y-6">
                                                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5">
                                                    <h3 className="font-semibold text-slate-950">
                                                        Pending Appointment Requests
                                                    </h3>
                                                    <div className="mt-4 space-y-3">
                                                        {appointmentsLoading ? (
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                                Loading appointments...
                                                            </div>
                                                        ) : appointments.filter(
                                                              (item) =>
                                                                  item.status ===
                                                                  "Pending"
                                                          ).length ? (
                                                            appointments
                                                                .filter(
                                                                    (item) =>
                                                                        item.status ===
                                                                        "Pending"
                                                                )
                                                                .map((item) => (
                                                                    <div
                                                                        key={item.id}
                                                                        className="rounded-3xl bg-white p-4 ring-1 ring-slate-200"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div>
                                                                                <p className="font-semibold text-slate-900">
                                                                                    {
                                                                                        item.patient_name
                                                                                    }
                                                                                </p>
                                                                                <p className="mt-1 text-sm text-slate-500">
                                                                                    {
                                                                                        item.department
                                                                                    }{" "}
                                                                                    •{" "}
                                                                                    {formatAppointmentDate(
                                                                                        item.appointment_date
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                            <span
                                                                                className={`rounded-full px-3 py-1 text-xs font-medium ${getUrgencyTone(
                                                                                    item.urgency
                                                                                )}`}
                                                                            >
                                                                                {
                                                                                    item.urgency
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <p className="mt-3 text-sm leading-6 text-slate-600">
                                                                            {item.symptoms ||
                                                                                "No symptom details were included."}
                                                                        </p>
                                                                        <div className="mt-4 flex gap-2">
                                                                            <Button
                                                                                size="sm"
                                                                                className="rounded-full"
                                                                                onClick={() =>
                                                                                    openAdminDialog(
                                                                                        item
                                                                                    )
                                                                                }
                                                                            >
                                                                                Review & Assign
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="rounded-full"
                                                                                disabled={
                                                                                    savingAppointmentId ===
                                                                                    item.id
                                                                                }
                                                                                onClick={() =>
                                                                                    void updateAppointment(
                                                                                        item.id,
                                                                                        {
                                                                                            status:
                                                                                                "Rejected",
                                                                                        }
                                                                                    )
                                                                                }
                                                                            >
                                                                                Reject
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                        ) : (
                                                            <EmptyState
                                                                title="No pending requests"
                                                                description="New public appointment requests will appear here for admin review."
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5">
                                                    <h3 className="font-semibold text-slate-950">
                                                        Department Demand
                                                    </h3>
                                                    <div className="mt-4 space-y-4">
                                                        {departmentDemand.map((item) => (
                                                            <div key={item.name}>
                                                                <div className="mb-2 flex justify-between text-sm text-slate-600">
                                                                    <span>{item.name}</span>
                                                                    <span>
                                                                        {item.count} request
                                                                        {item.count === 1
                                                                            ? ""
                                                                            : "s"}
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 rounded-full bg-slate-200">
                                                                    <div
                                                                        className="h-2 rounded-full bg-slate-900"
                                                                        style={{
                                                                            width: `${Math.max(
                                                                                item.percent,
                                                                                item.count > 0
                                                                                    ? 8
                                                                                    : 0
                                                                            )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div ref={adminEmergencyRef}>
                                                    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5">
                                                        <h3 className="font-semibold text-slate-950">
                                                            Emergency Requests
                                                        </h3>
                                                        <div className="mt-4 space-y-3">
                                                        {emergencyLoading ? (
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                                Loading emergency requests...
                                                            </div>
                                                        ) : emergencyRequests.length ? (
                                                            emergencyRequests.map((request) => (
                                                                <div
                                                                    key={request.id}
                                                                    className="rounded-3xl bg-white p-4 ring-1 ring-slate-200"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <p className="font-semibold text-slate-900">
                                                                                {request.patient_name ||
                                                                                    "Unnamed request"}
                                                                            </p>
                                                                            <p className="mt-1 text-sm text-slate-500">
                                                                                {request.phone ||
                                                                                    "No phone provided"}{" "}
                                                                                •{" "}
                                                                                {formatDateTime(
                                                                                    request.created_at
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                                                                            {request.status}
                                                                        </span>
                                                                    </div>
                                                                    {request.notes ? (
                                                                        <p className="mt-3 text-sm leading-6 text-slate-600">
                                                                            {request.notes}
                                                                        </p>
                                                                    ) : null}
                                                                    <a
                                                                        href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900"
                                                                    >
                                                                        Open map
                                                                        <ArrowRight className="h-4 w-4" />
                                                                    </a>
                                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                                        {[
                                                                            "Requested",
                                                                            "Dispatched",
                                                                            "Resolved",
                                                                            "Cancelled",
                                                                        ].map((status) => (
                                                                            <Button
                                                                                key={status}
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="rounded-full"
                                                                                disabled={
                                                                                    savingEmergencyId ===
                                                                                    request.id
                                                                                }
                                                                                onClick={() =>
                                                                                    void updateEmergencyRequest(
                                                                                        request.id,
                                                                                        status as EmergencyRequest["status"]
                                                                                    )
                                                                                }
                                                                            >
                                                                                {status}
                                                                            </Button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <EmptyState
                                                                title="No emergency requests"
                                                                description="Prototype emergency requests will appear here for review and status updates."
                                                            />
                                                        )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5">
                                                    <h3 className="font-semibold text-slate-950">
                                                        Appointment Status Overview
                                                    </h3>
                                                    <div className="mt-4 space-y-3">
                                                        {appointments.length ? (
                                                            appointments.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="flex items-center justify-between rounded-3xl bg-white px-4 py-3 ring-1 ring-slate-200"
                                                                >
                                                                    <div>
                                                                        <p className="font-medium text-slate-900">
                                                                            {item.patient_name}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500">
                                                                            {item.department} •{" "}
                                                                            {formatAppointmentDate(
                                                                                item.appointment_date
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="rounded-full"
                                                                        onClick={() =>
                                                                            openAdminDialog(item)
                                                                        }
                                                                    >
                                                                        {item.status}
                                                                    </Button>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <EmptyState
                                                                title="No appointment requests yet"
                                                                description="Status tracking will appear once patients begin submitting requests."
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5">
                                                    <h3 className="font-semibold text-slate-950">
                                                        Recent Chat Logs
                                                    </h3>
                                                    {chatLogsError ? (
                                                        <p className="mt-4 text-sm text-rose-600">
                                                            {chatLogsError}
                                                        </p>
                                                    ) : null}
                                                    <div className="mt-4 space-y-3">
                                                        {chatLogsLoading ? (
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                                Loading chat logs...
                                                            </div>
                                                        ) : chatLogs.length ? (
                                                            chatLogs.map((log) => (
                                                                <div
                                                                    key={log.id}
                                                                    className="rounded-3xl bg-white p-4 ring-1 ring-slate-200"
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span
                                                                            className={`rounded-full px-3 py-1 text-xs font-medium ${getUrgencyTone(
                                                                                log.urgency
                                                                            )}`}
                                                                        >
                                                                            {log.urgency}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400">
                                                                            {formatDateTime(
                                                                                log.created_at
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-3 text-sm font-medium text-slate-900">
                                                                        {log.user_message}
                                                                    </p>
                                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                                        {log.assistant_reply}
                                                                    </p>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <EmptyState
                                                                title="No chat logs available"
                                                                description="Recent patient conversations will appear here when chat log saving is available in Supabase."
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )
                    ) : null}

                    {activeTab === "architecture" ? (
                        <Card className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
                            <CardContent className="p-6 sm:p-8">
                                <SectionHeading
                                    icon={ShieldCheck}
                                    title="System Architecture"
                                    description="The application keeps public booking available, protects staff dashboards with Supabase Auth, supports optional patient accounts, and limits AI to safe education and operational assistance."
                                />
                                <div className="mt-8 grid gap-4 md:grid-cols-5">
                                    {[
                                        [
                                            "Frontend",
                                            "Public patient UI, patient portal, and staff dashboards.",
                                        ],
                                        [
                                            "API Layer",
                                            "Authentication, appointments, chat logs, emergency requests, and trusted lookup.",
                                        ],
                                        [
                                            "AI Layer",
                                            "OpenAI assists with safe responses and educational summaries only.",
                                        ],
                                        [
                                            "Medical Data",
                                            "Trusted MedlinePlus and NIH sources for general health education.",
                                        ],
                                        [
                                            "Database",
                                            "Supabase stores profiles, appointments, chat logs, departments, and emergency requests.",
                                        ],
                                    ].map(([title, description], index) => (
                                        <div
                                            key={title}
                                            className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 text-center"
                                        >
                                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white font-semibold text-slate-900 ring-1 ring-slate-200">
                                                {index + 1}
                                            </div>
                                            <p className="font-semibold text-slate-900">
                                                {title}
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                {description}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                                    <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        Safety Rules
                                    </h3>
                                    <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700 md:grid-cols-2">
                                        <li>No final AI diagnosis</li>
                                        <li>Professional consultation recommended</li>
                                        <li>Emergency requests are a prototype only</li>
                                        <li>Doctors remain responsible for final decisions</li>
                                        <li>Patient appointment booking remains public</li>
                                        <li>
                                            For life-threatening emergencies, contact local
                                            emergency services immediately
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </motion.div>
            </main>
        </div>
    );
}
