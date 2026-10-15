-- C-143: own photos for the 14 hotels that still showed the city photo, from LiteAPI's hotel
-- content (Zaid, 15 Oct: "Just use LiteAPI. If it's a problem they will reach out", D-51). The
-- hotels' own marketing photos; credited with the hotel's name. Self-hosted in apps/web/public/hotels;
-- image_url feeds OG cards and emails. Also fills liteapi_id where the match was missing.
update public.hotels h
set image_url = v.image_url,
    image_credit = v.image_credit,
    image_source_url = 'https://www.liteapi.travel/',
    liteapi_id = coalesce(h.liteapi_id, v.liteapi_id)
from (values
  ('bulgari-hotel-milano', 'https://static.cupid.travel/hotels/599184021.jpg', 'Foto: Bvlgari Hotel Milano, via LiteAPI', 'lp35dae'),
  ('bvlgari-resort-dubai', 'https://static.cupid.travel/hotels/ex_e5b6b220_z.jpg', 'Foto: Bvlgari Resort Dubai, via LiteAPI', 'lpbd211'),
  ('capella-bangkok', 'https://static.cupid.travel/hotels/300728536.jpg', 'Foto: Capella Bangkok, via LiteAPI', 'lp65561e38'),
  ('four-seasons-hotel-abu-dhabi-at-al-maryah-island', 'https://static.cupid.travel/hotels/ex_e3ff3c2c_z.jpg', 'Foto: Four Seasons Hotel Abu Dhabi at Al Maryah Island, via LiteAPI', 'lp8ffa8'),
  ('four-seasons-resort-dubai-at-jumeirah-beach', 'https://static.cupid.travel/hotels/ex_ed0049e6_z.jpg', 'Foto: Four Seasons Resort Dubai at Jumeirah Beach, via LiteAPI', 'lp72e2c'),
  ('mandarin-oriental-bosphorus-istanbul', 'https://static.cupid.travel/hotels/580158074.jpg', 'Foto: Mandarin Oriental Bosphorus, Istanbul, via LiteAPI', 'lp6556e28f'),
  ('mandarin-oriental-jumeira-dubai', 'https://static.cupid.travel/hotels/ex_2debbc87_z.jpg', 'Foto: Mandarin Oriental Jumeira, Dubai, via LiteAPI', 'lp10249d'),
  ('raffles-sentosa-singapore', 'https://static.cupid.travel/hotels/ex_536c9362_z.jpg', 'Foto: Raffles Sentosa Singapore, via LiteAPI', 'lp65865947'),
  ('the-abu-dhabi-edition', 'https://static.cupid.travel/hotels/ex_1bf8eb8b_z.jpg', 'Foto: The Abu Dhabi Edition, via LiteAPI', 'lp199f82'),
  ('the-ivens-lissabon', 'https://static.cupid.travel/hotels/461607182.jpg', 'Foto: The Ivens, Autograph Collection, via LiteAPI', 'lp6556b21b'),
  ('the-ritz-carlton-maldives-fari-islands', 'https://static.cupid.travel/hotels/525123270.jpg', 'Foto: The Ritz-Carlton Maldives, Fari Islands, via LiteAPI', 'lp6556244f'),
  ('the-shanghai-edition', 'https://static.cupid.travel/hotels/412913777.jpg', 'Foto: The Shanghai EDITION, via LiteAPI', 'lpe7ee0'),
  ('the-siam-bangkok', 'https://static.cupid.travel/hotels/ex_05c0843d_z.jpg', 'Foto: The Siam, via LiteAPI', 'lp606f5'),
  ('the-st-regis-saadiyat-island-resort-abu-dhabi', 'https://static.cupid.travel/hotels/ex_740f27d9_z.jpg', 'Foto: The St. Regis Saadiyat Island Resort, Abu Dhabi, via LiteAPI', 'lp5f24c')
) as v (slug, image_url, image_credit, liteapi_id)
where h.slug = v.slug;
