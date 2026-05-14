import { departments } from "@/lib/departments";

const ROOM_BY_DEPARTMENT: Record<string, string> = {
    Cardiology: "C-101",
    "Respiratory Medicine": "R-204",
    Neurology: "N-302",
    Gastroenterology: "G-210",
    "General Medicine": "GM-100",
};

const DEFAULT_CLINIC_START_HOUR = 9;
const DEFAULT_CLINIC_START_MINUTE = 0;
const DEFAULT_SLOT_MINUTES = 15;

interface ExistingAppointmentLike {
    id: string;
    appointment_date: string;
    assigned_doctor?: string | null;
    queue_number?: number | null;
    current_queue_number?: number | null;
}

interface AppointmentAssignmentInput {
    id: string;
    appointment_date: string;
    department: string;
    assigned_doctor?: string | null;
    room_number?: string | null;
    appointment_number?: string | null;
    queue_number?: number | null;
    current_queue_number?: number | null;
    appointment_time?: string | null;
}

export interface AppointmentAssignmentDefaults {
    assignedDoctor: string;
    roomNumber: string;
    appointmentNumber: string;
    queueNumber: number;
    currentQueueNumber: number;
    appointmentTime: string;
}

function findDepartment(departmentName: string) {
    return departments.find((department) => department.name === departmentName);
}

export function inferAssignedDoctor(departmentName: string) {
    return findDepartment(departmentName)?.consultant ?? "Dr. Sahan Wijesinghe";
}

export function inferRoomNumber(departmentName: string) {
    return ROOM_BY_DEPARTMENT[departmentName] ?? "GM-100";
}

export function buildDoctorCode(doctorName: string) {
    const cleanName = doctorName.replace(/^Dr\.\s*/i, "").trim();
    const words = cleanName.split(/\s+/).filter(Boolean);

    if (!words.length) {
        return "DR";
    }

    return words
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 3);
}

function formatDateCode(date: string) {
    return date.replaceAll("-", "");
}

function formatQueuePadded(value: number) {
    return String(value).padStart(3, "0");
}

export function buildAppointmentNumber(
    appointmentDate: string,
    doctorName: string,
    queueNumber: number
) {
    return `SSH-${formatDateCode(appointmentDate)}-${buildDoctorCode(
        doctorName
    )}-${formatQueuePadded(queueNumber)}`;
}

export function buildSuggestedAppointmentTime(queueNumber: number) {
    const totalMinutes =
        DEFAULT_CLINIC_START_HOUR * 60 +
        DEFAULT_CLINIC_START_MINUTE +
        Math.max(queueNumber - 1, 0) * DEFAULT_SLOT_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function isToday(dateString: string) {
    const value = new Date(dateString);
    const today = new Date();

    return value.toDateString() === today.toDateString();
}

export function buildAssignmentDefaults(
    appointment: AppointmentAssignmentInput,
    existingAppointments: ExistingAppointmentLike[]
) {
    const assignedDoctor =
        appointment.assigned_doctor?.trim() ||
        inferAssignedDoctor(appointment.department);
    const roomNumber =
        appointment.room_number?.trim() || inferRoomNumber(appointment.department);

    const matchingDoctorAppointments = existingAppointments.filter(
        (item) =>
            item.id !== appointment.id &&
            item.appointment_date === appointment.appointment_date &&
            item.assigned_doctor?.trim() === assignedDoctor
    );

    const highestQueueNumber = matchingDoctorAppointments.reduce((highest, item) => {
        if (typeof item.queue_number === "number") {
            return Math.max(highest, item.queue_number);
        }

        return highest;
    }, 0);

    const queueNumber =
        typeof appointment.queue_number === "number" && appointment.queue_number > 0
            ? appointment.queue_number
            : highestQueueNumber + 1;

    const currentQueueFromSchedule = matchingDoctorAppointments.reduce(
        (highest, item) => {
            if (typeof item.current_queue_number === "number") {
                return Math.max(highest, item.current_queue_number);
            }

            return highest;
        },
        0
    );

    const currentQueueNumber =
        typeof appointment.current_queue_number === "number"
            ? appointment.current_queue_number
            : isToday(appointment.appointment_date)
              ? currentQueueFromSchedule
              : 0;

    const appointmentNumber =
        appointment.appointment_number?.trim() ||
        buildAppointmentNumber(appointment.appointment_date, assignedDoctor, queueNumber);
    const appointmentTime =
        appointment.appointment_time?.trim() ||
        buildSuggestedAppointmentTime(queueNumber);

    return {
        assignedDoctor,
        roomNumber,
        appointmentNumber,
        queueNumber,
        currentQueueNumber,
        appointmentTime,
    } satisfies AppointmentAssignmentDefaults;
}
