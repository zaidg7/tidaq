-- C-161: the creator kit's "Gepostet" button failed for every drop since C-125, because drops are
-- trips of 5 or 7 nights now and posted_drops still allowed at most 2 nights. Allow trips up to
-- 14 nights (the trip_drops limit) and YouTube Shorts as a third platform (bio link /youtube).
alter table public.posted_drops drop constraint posted_drops_check;
alter table public.posted_drops
  add constraint posted_drops_check check (check_out > night and check_out <= night + 14);

alter table public.posted_drops drop constraint posted_drops_platform_check;
alter table public.posted_drops
  add constraint posted_drops_platform_check check (platform in ('tiktok', 'instagram', 'youtube'));
