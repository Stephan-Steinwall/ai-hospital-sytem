alter table public.appointments
add column if not exists ai_patient_summary text;

alter table public.profiles
add column if not exists preferred_language text not null default 'en';
