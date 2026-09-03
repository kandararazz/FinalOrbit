-- 1. Create 1v1 Matchmaking Rooms Table
create table if not exists public.duel_rooms (
  id uuid default gen_random_uuid() primary key,
  room_code text unique not null,
  host_callsign text not null,
  challenger_callsign text,
  status text not null default 'WAITING', -- 'WAITING', 'IN_GAME', 'FINISHED'
  winner_callsign text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Global Highscore Leaderboard Table
create table if not exists public.leaderboard (
  id uuid default gen_random_uuid() primary key,
  callsign text not null,
  score integer not null default 0,
  wave_reached integer not null default 1,
  wins integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.duel_rooms enable row level security;
alter table public.leaderboard enable row level security;

-- 4. Open Policies for Public Client Access (Anon Key)
create policy "Allow public read access on duel_rooms"
  on public.duel_rooms for select using (true);

create policy "Allow public insert on duel_rooms"
  on public.duel_rooms for insert with check (true);

create policy "Allow public update on duel_rooms"
  on public.duel_rooms for update using (true);

create policy "Allow public read on leaderboard"
  on public.leaderboard for select using (true);

create policy "Allow public insert on leaderboard"
  on public.leaderboard for insert with check (true);

-- 5. Enable Realtime Replication for Instant Room Updates
alter publication supabase_realtime add table public.duel_rooms;

-- 6. Create 1v1 Competitive Duel Leaderboard Table
create table if not exists public.duel_leaderboard (
  id uuid default gen_random_uuid() primary key,
  callsign text unique not null,
  mmr_rating integer not null default 1000,
  duel_wins integer not null default 0,
  duel_losses integer not null default 0,
  win_streak integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.duel_leaderboard enable row level security;

create policy "Allow public read on duel_leaderboard"
  on public.duel_leaderboard for select using (true);

create policy "Allow public insert/update on duel_leaderboard"
  on public.duel_leaderboard for all using (true);
