-- Checkout audit screenshots (C-032b, PLAN §8): private bucket. No storage policies on purpose,
-- so only the service role (the admin server code after requireAdmin) can read or write.
-- Views use short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audit-screenshots', 'audit-screenshots', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
