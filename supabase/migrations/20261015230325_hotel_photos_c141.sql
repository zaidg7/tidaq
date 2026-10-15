-- C-141: own photos for two of the 17 hotels that showed the city photo (Unsplash License, free for
-- commercial use; credited anyway). Self-hosted in apps/web/public/hotels; image_url feeds OG cards
-- and emails.
update public.hotels h
set image_url = v.image_url, image_credit = v.image_credit, image_source_url = v.image_source_url
from (values
  ('waldorf-astoria-maldives-ithaafushi', 'https://images.unsplash.com/photo-1663572354532-db7fbde50cd0?fm=jpg&q=80&fit=crop&w=1280', 'Foto: Muhammadh Saamy, via Unsplash', 'https://unsplash.com/photos/Oy2HLoBOiPg'),
  ('rosewood-abu-dhabi', 'https://images.unsplash.com/photo-1647871467973-e3ee32d2dc6b?fm=jpg&q=80&fit=crop&w=1280', 'Foto: Salah Regouane, via Unsplash', 'https://unsplash.com/photos/inTUOaEcMvY')
) as v (slug, image_url, image_credit, image_source_url)
where h.slug = v.slug;
