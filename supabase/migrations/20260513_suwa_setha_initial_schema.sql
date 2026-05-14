create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    role text not null default 'patient' check (role in ('patient', 'doctor', 'admin')),
    created_at timestamptz not null default now()
);

create table if not exists public.departments (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null unique,
    consultant text not null,
    specialty text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.appointments (
    id uuid primary key default gen_random_uuid(),
    patient_name text not null,
    phone text not null,
    patient_email text,
    patient_user_id uuid references auth.users (id) on delete set null,
    appointment_date date not null,
    appointment_time text,
    follow_up_date date,
    department text not null,
    symptoms text,
    urgency text not null default 'Medium' check (urgency in ('Low', 'Medium', 'High')),
    status text not null default 'Pending' check (status in ('Pending', 'Approved', 'In Progress', 'Completed', 'Rejected', 'Cancelled')),
    appointment_number text,
    queue_number integer,
    current_queue_number integer,
    assigned_doctor text,
    room_number text,
    public_patient_notes text,
    internal_staff_notes text,
    completed_at timestamptz,
    feedback_rating integer check (feedback_rating between 1 and 5),
    feedback_comment text,
    created_at timestamptz not null default now()
);

create table if not exists public.chat_logs (
    id uuid primary key default gen_random_uuid(),
    user_message text not null,
    assistant_reply text not null,
    urgency text not null default 'Medium' check (urgency in ('Low', 'Medium', 'High')),
    suggested_department text,
    created_at timestamptz not null default now()
);

create table if not exists public.emergency_requests (
    id uuid primary key default gen_random_uuid(),
    patient_name text,
    phone text,
    latitude double precision not null,
    longitude double precision not null,
    notes text,
    status text not null default 'Requested' check (status in ('Requested', 'Dispatched', 'Resolved', 'Cancelled')),
    created_at timestamptz not null default now()
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, role)
    values (new.id, 'patient')
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.appointments enable row level security;
alter table public.chat_logs enable row level security;
alter table public.emergency_requests enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles can be inserted by owner" on public.profiles;
create policy "Profiles can be inserted by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles can be updated by owner" on public.profiles;
create policy "Profiles can be updated by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Departments are public readable" on public.departments;
create policy "Departments are public readable"
on public.departments
for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage departments" on public.departments;
create policy "Admins manage departments"
on public.departments
for all
to authenticated
using (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Public can create appointments" on public.appointments;
create policy "Public can create appointments"
on public.appointments
for insert
to anon, authenticated
with check (true);

drop policy if exists "Patients can read their appointments" on public.appointments;
create policy "Patients can read their appointments"
on public.appointments
for select
to authenticated
using (patient_user_id = auth.uid());

drop policy if exists "Patients can update feedback on their appointments" on public.appointments;
create policy "Patients can update feedback on their appointments"
on public.appointments
for update
to authenticated
using (patient_user_id = auth.uid())
with check (patient_user_id = auth.uid());

drop policy if exists "Staff can read appointments" on public.appointments;
create policy "Staff can read appointments"
on public.appointments
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role in ('doctor', 'admin')
    )
);

drop policy if exists "Staff can update appointments" on public.appointments;
create policy "Staff can update appointments"
on public.appointments
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role in ('doctor', 'admin')
    )
)
with check (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role in ('doctor', 'admin')
    )
);

drop policy if exists "Public can create chat logs" on public.chat_logs;
create policy "Public can create chat logs"
on public.chat_logs
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read chat logs" on public.chat_logs;
create policy "Admins can read chat logs"
on public.chat_logs
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Public can create emergency requests" on public.emergency_requests;
create policy "Public can create emergency requests"
on public.emergency_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "Staff can read emergency requests" on public.emergency_requests;
create policy "Staff can read emergency requests"
on public.emergency_requests
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role in ('doctor', 'admin')
    )
);

drop policy if exists "Staff can update emergency requests" on public.emergency_requests;
create policy "Staff can update emergency requests"
on public.emergency_requests
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role in ('doctor', 'admin')
    )
)
with check (
    exists (
        select 1
        from public.profiles as p
        where p.id = auth.uid()
          and p.role in ('doctor', 'admin')
    )
);

insert into public.departments (slug, name, consultant, specialty)
values
    ('cardiology', 'Cardiology', 'Dr. Nimal Perera', 'Chest pain, palpitations, blood pressure, heart-related symptoms'),
    ('respiratory-medicine', 'Respiratory Medicine', 'Dr. Ayesha Fernando', 'Cough, asthma, breathing difficulty, lung-related symptoms'),
    ('neurology', 'Neurology', 'Dr. Kavindu Silva', 'Headache, dizziness, seizures, weakness, nerve-related symptoms'),
    ('gastroenterology', 'Gastroenterology', 'Dr. Malini Jayawardena', 'Stomach pain, vomiting, diarrhoea, digestion-related symptoms'),
    ('general-medicine', 'General Medicine', 'Dr. Sahan Wijesinghe', 'Fever, body pain, general illness, initial medical consultation')
on conflict (name) do update
set
    consultant = excluded.consultant,
    specialty = excluded.specialty;
