create extension if not exists pgcrypto;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  wfh_days text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_wfh_days_max_two check (cardinality(wfh_days) <= 2)
);

create table if not exists public.daily_attendance (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  staff_name text not null references public.team_members(name) on update cascade on delete cascade,
  leave_type text not null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_attendance_leave_type_check check (leave_type in ('AL', 'MC', 'EL', 'RL', 'PL', 'ML', 'HL', 'CL', 'Others')),
  constraint daily_attendance_unique unique (attendance_date, staff_name)
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

create or replace trigger trg_team_members_updated_at
before update on public.team_members
for each row
execute function public.set_updated_at();

create or replace trigger trg_daily_attendance_updated_at
before update on public.daily_attendance
for each row
execute function public.set_updated_at();

insert into public.team_members (name, wfh_days)
values
  ('Zahran', array['Monday','Wednesday']),
  ('Sheela', array['Tuesday','Thursday']),
  ('Nurshafiqah', array['Wednesday','Friday']),
  ('Danish', array['Monday','Thursday']),
  ('Syed', array['Tuesday','Friday']),
  ('Tamil', array['Monday','Wednesday']),
  ('Jeff', array['Tuesday','Thursday']),
  ('Hakim', array['Wednesday','Friday']),
  ('Razif', array['Monday','Friday']),
  ('Amal', array['Tuesday','Thursday'])
on conflict (name) do update set wfh_days = excluded.wfh_days;

alter table public.team_members enable row level security;
alter table public.daily_attendance enable row level security;

create policy "public read team_members"
on public.team_members
for select
to anon
using (true);

create policy "public read daily_attendance"
on public.daily_attendance
for select
to anon
using (true);
