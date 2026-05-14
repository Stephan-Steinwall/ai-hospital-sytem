export interface Department {
    id: string;
    name: string;
    consultant: string;
    specialty: string;
    keywords: string[];
}

export interface Appointment {
    id: string;
    patient_name: string;
    phone: string;
    appointment_date: string;
    department: string;
    symptoms: string | null;
    urgency: "Low" | "Medium" | "High";
    status:
        | "Pending"
        | "Approved"
        | "In Progress"
        | "Completed"
        | "Rejected"
        | "Cancelled";
    created_at: string;
    appointment_number?: string | null;
    queue_number?: number | null;
    current_queue_number?: number | null;
    assigned_doctor?: string | null;
    room_number?: string | null;
    appointment_time?: string | null;
    follow_up_date?: string | null;
    patient_user_id?: string | null;
    patient_email?: string | null;
    public_patient_notes?: string | null;
    internal_staff_notes?: string | null;
    completed_at?: string | null;
    feedback_rating?: number | null;
    feedback_comment?: string | null;
}

export interface MedicalSearchItem {
    title: string;
    summary: string;
    url: string;
    source: "MedlinePlus" | "NIH";
}

export interface ChatLog {
    id: string;
    user_message: string;
    assistant_reply: string;
    urgency: "Low" | "Medium" | "High";
    suggested_department: string | null;
    created_at: string;
}

export interface EmergencyRequest {
    id: string;
    patient_name: string | null;
    phone: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    status: "Requested" | "Dispatched" | "Resolved" | "Cancelled";
    created_at: string;
}
