-- C-013e: Villa Kennedy (Frankfurt) closed in 2022 and reopened in December 2025 as
-- "The Florentin" (Althoff Collection). Our Google identifier points at the closed listing, so
-- every Hotel Info task returned no results. DataForSEO Hotel Searches doesn't list
-- The Florentin yet (13 Oct 2026), so the hotel is switched off until it can be resolved.
-- Reversible: set active = true (or the /admin "Aktivieren" button) once the new ID is stored.
update public.hotels set active = false where slug = 'villa-kennedy-frankfurt' and active;
