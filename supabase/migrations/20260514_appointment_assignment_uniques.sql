create unique index if not exists appointments_doctor_date_queue_unique_idx
on public.appointments (appointment_date, assigned_doctor, queue_number)
where assigned_doctor is not null and queue_number is not null;
