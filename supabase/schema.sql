create extension if not exists pgcrypto;

create table if not exists public.daily_attendance (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  name text not null,
  leave_type text not null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_attendance_leave_type_check check (leave_type in ('AL', 'MC', 'EL', 'RL', 'PL', 'ML', 'HL', 'CL', 'Others')),
  constraint daily_attendance_unique unique (attendance_date, name)
);

create table if not exists public.wfh_schedule (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wfh_schedule_day_check check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  constraint wfh_schedule_unique unique (name, day)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_daily_attendance_updated_at
before update on public.daily_attendance
for each row
execute function public.set_updated_at();

create or replace trigger trg_wfh_schedule_updated_at
before update on public.wfh_schedule
for each row
execute function public.set_updated_at();

alter table public.daily_attendance enable row level security;
alter table public.wfh_schedule enable row level security;

create policy "public read daily_attendance"
on public.daily_attendance
for select
to anon
using (true);

create policy "public insert daily_attendance"
on public.daily_attendance
for insert
to anon
with check (true);

create policy "public update daily_attendance"
on public.daily_attendance
for update
to anon
using (true)
with check (true);

create policy "public delete daily_attendance"
on public.daily_attendance
for delete
to anon
using (true);

create policy "public read wfh_schedule"
on public.wfh_schedule
for select
to anon
using (true);

create policy "public insert wfh_schedule"
on public.wfh_schedule
for insert
to anon
with check (true);

create policy "public update wfh_schedule"
on public.wfh_schedule
for update
to anon
using (true)
with check (true);

create policy "public delete wfh_schedule"
on public.wfh_schedule
for delete
to anon
using (true);
