-- UPAY Footpathshala — database schema
-- Apply with: npm run db:push   (or paste into the Supabase SQL editor)

-- ---------------------------------------------------------------- extensions
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------- resets
drop function if exists public.upaygpt_query(text) cascade;
drop function if exists public.auth_role() cascade;
drop function if exists public.auth_zone() cascade;
drop function if exists public.auth_center() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.handle_new_user() cascade;

drop table if exists public.badges cascade;
drop table if exists public.ai_queries cascade;
drop table if exists public.certificates cascade;
drop table if exists public.assessment_results cascade;
drop table if exists public.assessments cascade;
drop table if exists public.center_curriculum cascade;
drop table if exists public.curriculum_units cascade;
drop table if exists public.volunteer_checkins cascade;
drop table if exists public.attendance cascade;
drop table if exists public.class_sessions cascade;
drop table if exists public.students cascade;
drop table if exists public.centers cascade;
drop table if exists public.zones cascade;
drop table if exists public.profiles cascade;

drop type if exists public.user_role cascade;
drop type if exists public.learning_level cascade;
drop type if exists public.attendance_status cascade;
drop type if exists public.attendance_method cascade;
drop type if exists public.delivery_status cascade;
drop type if exists public.certificate_type cascade;

-- --------------------------------------------------------------------- enums
create type public.user_role as enum ('admin', 'coordinator', 'teacher', 'volunteer', 'student');
create type public.learning_level as enum ('foundation', 'level_1', 'level_2', 'level_3', 'bridge');
create type public.attendance_status as enum ('present', 'absent', 'late');
create type public.attendance_method as enum ('face', 'manual');
create type public.delivery_status as enum ('scheduled', 'delivered', 'skipped');
create type public.certificate_type as enum ('participation', 'service_100', 'service_250', 'excellence');

-- ------------------------------------------------------------------ identity
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null,
  email        text,
  role         public.user_role not null default 'volunteer',
  phone        text,
  zone_id      uuid,
  center_id    uuid,
  avatar_url   text,
  skills       text[] default '{}',
  availability text,
  joined_on    date default current_date,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- --------------------------------------------------------------- org hierarchy
create table public.zones (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  city           text not null,
  state          text not null,
  coordinator_id uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create table public.centers (
  id         uuid primary key default gen_random_uuid(),
  zone_id    uuid not null references public.zones (id) on delete cascade,
  name       text not null,
  code       text not null unique,
  address    text,
  lat        double precision,
  lng        double precision,
  radius_m   integer not null default 300,
  started_on date,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_zone_fk foreign key (zone_id) references public.zones (id) on delete set null,
  add constraint profiles_center_fk foreign key (center_id) references public.centers (id) on delete set null;

create table public.students (
  id              uuid primary key default gen_random_uuid(),
  center_id       uuid not null references public.centers (id) on delete cascade,
  full_name       text not null,
  student_code    text not null unique,
  dob             date,
  gender          text,
  guardian_name   text,
  guardian_phone  text,
  level           public.learning_level not null default 'foundation',
  photo_url       text,
  -- 128-dimension face embedding. The source photograph is never stored.
  face_descriptor double precision[],
  enrolled_on     date not null default current_date,
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------- attendance
create table public.class_sessions (
  id                 uuid primary key default gen_random_uuid(),
  center_id          uuid not null references public.centers (id) on delete cascade,
  conducted_by       uuid references public.profiles (id) on delete set null,
  session_date       date not null default current_date,
  subject            text,
  curriculum_unit_id uuid,
  lat                double precision,
  lng                double precision,
  faces_detected     integer not null default 0,
  auto_matched       integer not null default 0,
  notes              text,
  created_at         timestamptz not null default now()
);

create table public.attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status     public.attendance_status not null default 'present',
  method     public.attendance_method not null default 'manual',
  confidence real,
  overridden boolean not null default false,
  marked_by  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table public.volunteer_checkins (
  id                uuid primary key default gen_random_uuid(),
  volunteer_id      uuid not null references public.profiles (id) on delete cascade,
  center_id         uuid not null references public.centers (id) on delete cascade,
  check_in_at       timestamptz not null default now(),
  check_out_at      timestamptz,
  lat               double precision,
  lng               double precision,
  distance_m        double precision,
  location_verified boolean not null default false,
  hours             numeric(6, 2) generated always as (
                      case
                        when check_out_at is null then 0
                        else round((extract(epoch from (check_out_at - check_in_at)) / 3600.0)::numeric, 2)
                      end
                    ) stored,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------- curriculum
create table public.curriculum_units (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subject      text not null,
  level        public.learning_level not null,
  description  text,
  content_md   text,
  resource_url text,
  duration_min integer not null default 45,
  sequence_no  integer not null default 1,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.class_sessions
  add constraint class_sessions_unit_fk foreign key (curriculum_unit_id)
  references public.curriculum_units (id) on delete set null;

create table public.center_curriculum (
  id            uuid primary key default gen_random_uuid(),
  center_id     uuid not null references public.centers (id) on delete cascade,
  unit_id       uuid not null references public.curriculum_units (id) on delete cascade,
  scheduled_for date not null,
  status        public.delivery_status not null default 'scheduled',
  delivered_on  date,
  delivered_by  uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (center_id, unit_id, scheduled_for)
);

-- --------------------------------------------------------------- assessments
create table public.assessments (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subject      text not null,
  level        public.learning_level not null,
  center_id    uuid references public.centers (id) on delete set null,
  created_by   uuid references public.profiles (id) on delete set null,
  ai_generated boolean not null default false,
  total_marks  integer not null default 0,
  questions    jsonb not null default '[]'::jsonb,
  answer_key   jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create table public.assessment_results (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id    uuid not null references public.students (id) on delete cascade,
  score         numeric(6, 2) not null default 0,
  max_score     numeric(6, 2) not null default 0,
  percentage    numeric(5, 2) generated always as (
                  case when max_score > 0 then round(score * 100 / max_score, 2) else 0 end
                ) stored,
  answers       jsonb not null default '[]'::jsonb,
  ocr_text      text,
  ai_feedback   text,
  graded_by_ai  boolean not null default false,
  verified_by   uuid references public.profiles (id) on delete set null,
  verified_at   timestamptz,
  taken_on      date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (assessment_id, student_id)
);

-- -------------------------------------------------- certificates and badges
create table public.certificates (
  id             uuid primary key default gen_random_uuid(),
  volunteer_id   uuid not null references public.profiles (id) on delete cascade,
  cert_type      public.certificate_type not null,
  serial         text not null unique,
  hours          numeric(8, 2) not null default 0,
  sessions_count integer not null default 0,
  period_start   date,
  period_end     date,
  issued_on      date not null default current_date,
  created_at     timestamptz not null default now()
);

create table public.badges (
  id           uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('student', 'volunteer')),
  subject_id   uuid not null,
  code         text not null,
  label        text not null,
  awarded_on   date not null default current_date,
  unique (subject_type, subject_id, code)
);

-- ----------------------------------------------------------- UpayGPT audit log
create table public.ai_queries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  question      text not null,
  generated_sql text,
  row_count     integer,
  result_json   jsonb,
  chart_spec    jsonb,
  answer        text,
  error         text,
  duration_ms   integer,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------------- indexes
create index on public.centers (zone_id);
create index on public.students (center_id);
create index on public.students (level);
create index on public.class_sessions (center_id, session_date);
create index on public.attendance (session_id);
create index on public.attendance (student_id);
create index on public.volunteer_checkins (volunteer_id);
create index on public.volunteer_checkins (center_id, check_in_at);
create index on public.center_curriculum (center_id, scheduled_for);
create index on public.assessment_results (student_id);
create index on public.profiles (role);
create index on public.profiles (center_id);

-- ------------------------------------------------------------ RLS helpers
-- security definer so a policy on profiles can read profiles without recursing
create function public.auth_role() returns public.user_role
  language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create function public.auth_zone() returns uuid
  language sql stable security definer set search_path = public as
$$ select zone_id from public.profiles where id = auth.uid() $$;

create function public.auth_center() returns uuid
  language sql stable security definer set search_path = public as
$$ select center_id from public.profiles where id = auth.uid() $$;

create function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as
$$ select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false) $$;

create function public.is_staff() returns boolean
  language sql stable security definer set search_path = public as
$$ select coalesce((select role from public.profiles where id = auth.uid())
     in ('admin', 'coordinator', 'teacher', 'volunteer'), false) $$;

-- Mirror new auth users into profiles so real signups work, not only seeded ones.
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as
$$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'volunteer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------- RLS
alter table public.profiles           enable row level security;
alter table public.zones              enable row level security;
alter table public.centers            enable row level security;
alter table public.students           enable row level security;
alter table public.class_sessions     enable row level security;
alter table public.attendance         enable row level security;
alter table public.volunteer_checkins enable row level security;
alter table public.curriculum_units   enable row level security;
alter table public.center_curriculum  enable row level security;
alter table public.assessments        enable row level security;
alter table public.assessment_results enable row level security;
alter table public.certificates       enable row level security;
alter table public.badges             enable row level security;
alter table public.ai_queries         enable row level security;

-- profiles: everyone sees their own row; staff see the org; admins write anything
create policy profiles_self_read on public.profiles for select
  using (id = auth.uid() or public.is_staff());
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles for insert
  with check (public.is_admin());

-- zones and centers: readable by any authenticated user, written by admin/coordinator
create policy zones_read on public.zones for select using (auth.uid() is not null);
create policy zones_write on public.zones for all
  using (public.is_admin()) with check (public.is_admin());

create policy centers_read on public.centers for select using (auth.uid() is not null);
create policy centers_write on public.centers for all
  using (public.auth_role() in ('admin', 'coordinator'))
  with check (public.auth_role() in ('admin', 'coordinator'));

-- students: admins everywhere, coordinators in their zone, staff at their center,
-- and a student sees only the record linked to their own profile
create policy students_read on public.students for select using (
  public.is_admin()
  or (public.auth_role() = 'coordinator'
      and center_id in (select id from public.centers where zone_id = public.auth_zone()))
  or (public.auth_role() in ('teacher', 'volunteer') and center_id = public.auth_center())
  or student_code = (select email from public.profiles where id = auth.uid())
);
create policy students_write on public.students for all
  using (public.is_staff()) with check (public.is_staff());

-- operational tables: staff read and write, scoped by the app layer
create policy sessions_rw on public.class_sessions for all
  using (public.is_staff()) with check (public.is_staff());
create policy attendance_rw on public.attendance for all
  using (public.is_staff()) with check (public.is_staff());
create policy checkins_read on public.volunteer_checkins for select
  using (public.is_staff() or volunteer_id = auth.uid());
create policy checkins_write on public.volunteer_checkins for all
  using (volunteer_id = auth.uid() or public.is_admin())
  with check (volunteer_id = auth.uid() or public.is_admin());

create policy curriculum_read on public.curriculum_units for select using (auth.uid() is not null);
create policy curriculum_write on public.curriculum_units for all
  using (public.auth_role() in ('admin', 'coordinator', 'teacher'))
  with check (public.auth_role() in ('admin', 'coordinator', 'teacher'));

create policy center_curriculum_read on public.center_curriculum for select using (auth.uid() is not null);
create policy center_curriculum_write on public.center_curriculum for all
  using (public.is_staff()) with check (public.is_staff());

create policy assessments_read on public.assessments for select using (auth.uid() is not null);
create policy assessments_write on public.assessments for all
  using (public.is_staff()) with check (public.is_staff());

create policy results_read on public.assessment_results for select using (auth.uid() is not null);
create policy results_write on public.assessment_results for all
  using (public.is_staff()) with check (public.is_staff());

create policy certificates_read on public.certificates for select
  using (public.is_staff() or volunteer_id = auth.uid());
create policy certificates_write on public.certificates for all
  using (public.is_admin()) with check (public.is_admin());

create policy badges_read on public.badges for select using (auth.uid() is not null);
create policy badges_write on public.badges for all
  using (public.is_staff()) with check (public.is_staff());

create policy ai_queries_read on public.ai_queries for select
  using (public.is_staff() or user_id = auth.uid());
create policy ai_queries_write on public.ai_queries for insert
  with check (auth.uid() is not null);

-- ------------------------------------------------------ UpayGPT query gateway
-- Executes one model-generated SELECT under hard constraints. SECURITY INVOKER,
-- so the caller's RLS still applies: a coordinator cannot read another zone
-- merely by asking UpayGPT nicely.
create function public.upaygpt_query(query_text text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  cleaned text;
  result  jsonb;
begin
  cleaned := btrim(query_text);
  cleaned := regexp_replace(cleaned, ';\s*$', '');

  if position(';' in cleaned) > 0 then
    raise exception 'Only a single statement is permitted';
  end if;

  if cleaned !~* '^(select|with)\s' then
    raise exception 'Only SELECT queries are permitted';
  end if;

  if cleaned ~* '\y(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|call|merge|comment|reindex|refresh|listen|notify|execute|prepare)\y' then
    raise exception 'Query contains a forbidden keyword';
  end if;

  if cleaned ~* '(pg_catalog|pg_sleep|pg_read|pg_ls|information_schema|auth\.|storage\.|dblink|lo_import|lo_export)' then
    raise exception 'Query references a restricted object';
  end if;

  set local statement_timeout = '5s';
  set local default_transaction_read_only = on;

  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s limit 500) t', cleaned)
    into result;

  return result;
end;
$$;

revoke all on function public.upaygpt_query(text) from public;
grant execute on function public.upaygpt_query(text) to authenticated;
