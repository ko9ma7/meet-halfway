-- 어?중간: Supabase schema
-- Run once in the Supabase SQL Editor. Safe to run again when upgrading functions.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  share_id text not null unique,
  title text not null check (char_length(title) between 1 and 60),
  deadline timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  admin_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  address text not null check (char_length(address) between 1 and 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  token_hash text not null,
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, token_hash)
);

create index if not exists participants_meeting_id_idx on public.participants(meeting_id);
create index if not exists meetings_share_id_idx on public.meetings(share_id);

alter table public.meetings enable row level security;
alter table public.participants enable row level security;

-- 테이블 직접 접근은 열지 않습니다. anon 사용자는 아래 SECURITY DEFINER RPC만 실행합니다.
revoke all on public.meetings from anon, authenticated;
revoke all on public.participants from anon, authenticated;

create or replace function public.create_meeting(
  p_title text,
  p_creator_name text,
  p_creator_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_deadline timestamptz,
  p_admin_token text,
  p_participant_token text
)
returns table (share_id text, meeting_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_meeting_id uuid := gen_random_uuid();
  v_share_id text := encode(gen_random_bytes(12), 'hex');
begin
  if p_deadline <= now() then
    raise exception '입력 마감은 현재보다 이후여야 합니다.';
  end if;
  if char_length(trim(p_title)) < 1 or char_length(trim(p_creator_name)) < 1 then
    raise exception '모임 이름과 생성자 이름을 입력해주세요.';
  end if;
  if char_length(trim(p_creator_address)) < 1 then
    raise exception '출발 위치를 입력해주세요.';
  end if;
  if char_length(coalesce(p_admin_token, '')) < 32 or char_length(coalesce(p_participant_token, '')) < 32 then
    raise exception '보안 토큰 길이가 올바르지 않습니다.';
  end if;

  while exists(select 1 from public.meetings m where m.share_id = v_share_id) loop
    v_share_id := encode(gen_random_bytes(12), 'hex');
  end loop;

  insert into public.meetings(id, share_id, title, deadline, admin_token_hash)
  values (
    v_meeting_id,
    v_share_id,
    left(trim(p_title), 60),
    p_deadline,
    encode(digest(p_admin_token, 'sha256'), 'hex')
  );

  insert into public.participants(meeting_id, name, address, latitude, longitude, token_hash, is_host)
  values (
    v_meeting_id,
    left(trim(p_creator_name), 30),
    left(trim(p_creator_address), 500),
    p_latitude,
    p_longitude,
    encode(digest(p_participant_token, 'sha256'), 'hex'),
    true
  );

  return query select v_share_id, v_meeting_id;
end;
$$;

create or replace function public.get_meeting(p_share_id text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  v_meeting public.meetings%rowtype;
  v_result jsonb;
begin
  select * into v_meeting from public.meetings where share_id = p_share_id limit 1;
  if not found then return null; end if;

  select jsonb_build_object(
    'meeting', jsonb_build_object(
      'id', v_meeting.id,
      'share_id', v_meeting.share_id,
      'title', v_meeting.title,
      'deadline', v_meeting.deadline,
      'status', v_meeting.status,
      'created_at', v_meeting.created_at
    ),
    'participants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'address', p.address,
          'latitude', p.latitude,
          'longitude', p.longitude,
          'created_at', p.created_at,
          'is_host', p.is_host
        ) order by p.created_at asc
      )
      from public.participants p
      where p.meeting_id = v_meeting.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.upsert_participant(
  p_share_id text,
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_participant_token text
)
returns table (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_meeting public.meetings%rowtype;
  v_hash text := encode(digest(p_participant_token, 'sha256'), 'hex');
begin
  select * into v_meeting from public.meetings where share_id = p_share_id limit 1;
  if not found then raise exception '모임을 찾을 수 없습니다.'; end if;
  if v_meeting.status <> 'open' or v_meeting.deadline <= now() then
    raise exception '이미 입력이 마감된 모임입니다.';
  end if;
  if char_length(trim(p_name)) < 1 then raise exception '이름을 입력해주세요.'; end if;
  if char_length(trim(p_address)) < 1 then raise exception '출발 위치를 입력해주세요.'; end if;
  if char_length(coalesce(p_participant_token, '')) < 32 then raise exception '참가자 토큰 길이가 올바르지 않습니다.'; end if;

  return query
  insert into public.participants(meeting_id, name, address, latitude, longitude, token_hash, is_host)
  values (
    v_meeting.id,
    left(trim(p_name), 30),
    left(trim(p_address), 500),
    p_latitude,
    p_longitude,
    v_hash,
    false
  )
  on conflict (meeting_id, token_hash) do update set
    name = excluded.name,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now()
  returning participants.id, participants.name, participants.address, participants.latitude, participants.longitude, participants.created_at;
end;
$$;

create or replace function public.close_meeting(p_share_id text, p_admin_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(digest(p_admin_token, 'sha256'), 'hex');
begin
  if char_length(coalesce(p_admin_token, '')) < 32 then
    raise exception '관리 토큰 길이가 올바르지 않습니다.';
  end if;
  update public.meetings
  set status = 'closed', updated_at = now()
  where share_id = p_share_id and admin_token_hash = v_hash;

  if not found then
    raise exception '관리 키가 올바르지 않거나 모임을 찾을 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.create_meeting(text, text, text, double precision, double precision, timestamptz, text, text) from public;
revoke all on function public.get_meeting(text) from public;
revoke all on function public.upsert_participant(text, text, text, double precision, double precision, text) from public;
revoke all on function public.close_meeting(text, text) from public;

grant execute on function public.create_meeting(text, text, text, double precision, double precision, timestamptz, text, text) to anon, authenticated;
grant execute on function public.get_meeting(text) to anon, authenticated;
grant execute on function public.upsert_participant(text, text, text, double precision, double precision, text) to anon, authenticated;
grant execute on function public.close_meeting(text, text) to anon, authenticated;
