-- C-013f: Villa Kennedy (Frankfurt) reopened as "The Florentin" (Althoff Collection). Tripadvisor
-- lists it as g187337-d33302530 with Booking.com, Agoda and Trip.com prices, so the free source
-- (D-41) covers it again. Same building and hotel id; new name and slug; active again.
update public.hotels
   set name = 'The Florentin',
       slug = 'the-florentin-frankfurt',
       xotelo_key = 'g187337-d33302530',
       active = true
 where id = 16
   and slug = 'villa-kennedy-frankfurt'
   and not exists (select 1 from public.hotels h where h.xotelo_key = 'g187337-d33302530');
