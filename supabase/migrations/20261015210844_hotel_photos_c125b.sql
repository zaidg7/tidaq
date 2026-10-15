-- C-125: own photos for seven more hotels (licensed Wikimedia Commons files found via the
-- buildings they are in: Rijkspostspaarbank, Villa Kennedy, Chamber of Commerce, Otemachi towers).
update public.hotels h
set image_url = v.image_url, image_credit = v.image_credit, image_source_url = v.image_source_url
from (values
  ('mandarin-oriental-conservatorium-amsterdam', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Van_Baerlestraat_27%2C_Paulus_Potterstraat_%281%29.jpg/1280px-Van_Baerlestraat_27%2C_Paulus_Potterstraat_%281%29.jpg', 'Foto: Ceescamel, CC BY-SA 4.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Van_Baerlestraat_27,_Paulus_Potterstraat_(1).jpg'),
  ('the-florentin-frankfurt', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Hotel_Villa_Kennedy.JPG/1280px-Hotel_Villa_Kennedy.JPG', 'Foto: Chivista, Public domain, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Hotel_Villa_Kennedy.JPG'),
  ('park-hyatt-milano', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Park_Hyatt_Milan.JPG/1280px-Park_Hyatt_Milan.JPG', 'Foto: Ueutyi, CC BY-SA 4.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Park_Hyatt_Milan.JPG'),
  ('bvlgari-hotel-shanghai', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/%E4%B8%8A%E6%B5%B7%E6%80%BB%E5%95%86%E4%BC%9A%C2%B7%E4%B8%8A%E6%B5%B7.jpg/1280px-%E4%B8%8A%E6%B5%B7%E6%80%BB%E5%95%86%E4%BC%9A%C2%B7%E4%B8%8A%E6%B5%B7.jpg', 'Foto: Legolas1024, CC BY-SA 4.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:%E4%B8%8A%E6%B5%B7%E6%80%BB%E5%95%86%E4%BC%9A%C2%B7%E4%B8%8A%E6%B5%B7.jpg'),
  ('aman-tokyo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/The_Otemachi_Tower.JPG/1280px-The_Otemachi_Tower.JPG', 'Foto: Gungun01, CC BY-SA 3.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:The_Otemachi_Tower.JPG'),
  ('four-seasons-hotel-tokyo-at-otemachi', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Otemachi_One.jpg/1280px-Otemachi_One.jpg', 'Foto: Akonnchiroll, CC BY-SA 4.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Otemachi_One.jpg'),
  ('park-hyatt-zurich', 'https://upload.wikimedia.org/wikipedia/commons/5/59/15_Park_Hyatt_Hotel_Zurich.jpg', 'Foto: Andreas Ramseier, CC BY-SA 3.0 DE, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:15_Park_Hyatt_Hotel_Zurich.jpg')
) as v (slug, image_url, image_credit, image_source_url)
where h.slug = v.slug;
