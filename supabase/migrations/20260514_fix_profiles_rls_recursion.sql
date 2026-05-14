-- =============================================================================
-- Fix: Infinite recursion in profiles RLS policies
-- =============================================================================
-- The "Admins can view all profiles" policy on public.profiles caused infinite
-- recursion because it issued a sub-SELECT on public.profiles itself. PostgreSQL
-- evaluates ALL RLS policies on a table before returning rows, so querying
-- profiles from within a profiles policy creates an endless evaluation loop.
--
-- This affected every caller of loadUserRole (client and server), every table
-- whose RLS policy did `exists(select 1 from profiles...)`, and the patient
-- dashboard because it hits the profiles table directly.
--
-- The policy is also unnecessary: admin access to all profiles is handled
-- exclusively via the Supabase service-role (admin) client in API routes, which
-- bypasses RLS entirely. No UI path requires this policy.
-- =============================================================================

drop policy if exists "Admins can view all profiles" on public.profiles;

-- =============================================================================
-- Replace self-referencing role checks with a SECURITY DEFINER function.
--
-- A security definer function runs with the privileges of its definer (postgres)
-- rather than the calling user, so it bypasses RLS when reading profiles.
-- This is the canonical Supabase pattern for role-based RLS without recursion.
-- =============================================================================

create or replace function public.get_auth_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
    select role from public.profiles where id = auth.uid() limit 1;
$$;

-- Grant execute to authenticated and anon roles.
grant execute on function public.get_auth_user_role() to authenticated, anon;

-- =============================================================================
-- Re-create policies that previously did `exists(select 1 from profiles...)`
-- using the new security-definer function instead.
-- This removes the risk of recursion for all tables.
-- =============================================================================

-- Departments ----------------------------------------------------------------
drop policy if exists "Admins manage departments" on public.departments;
create policy "Admins manage departments"
on public.departments
for all
to authenticated
using (public.get_auth_user_role() = 'admin')
with check (public.get_auth_user_role() = 'admin');

-- Appointments ---------------------------------------------------------------
drop policy if exists "Staff can read appointments" on public.appointments;
create policy "Staff can read appointments"
on public.appointments
for select
to authenticated
using (public.get_auth_user_role() in ('doctor', 'admin'));

drop policy if exists "Staff can update appointments" on public.appointments;
create policy "Staff can update appointments"
on public.appointments
for update
to authenticated
using (public.get_auth_user_role() in ('doctor', 'admin'))
with check (public.get_auth_user_role() in ('doctor', 'admin'));

-- Chat logs ------------------------------------------------------------------
drop policy if exists "Admins can read chat logs" on public.chat_logs;
create policy "Admins can read chat logs"
on public.chat_logs
for select
to authenticated
using (public.get_auth_user_role() = 'admin');

-- Emergency requests ---------------------------------------------------------
drop policy if exists "Staff can read emergency requests" on public.emergency_requests;
create policy "Staff can read emergency requests"
on public.emergency_requests
for select
to authenticated
using (public.get_auth_user_role() in ('doctor', 'admin'));

drop policy if exists "Staff can update emergency requests" on public.emergency_requests;
create policy "Staff can update emergency requests"
on public.emergency_requests
for update
to authenticated
using (public.get_auth_user_role() in ('doctor', 'admin'))
with check (public.get_auth_user_role() in ('doctor', 'admin'));
