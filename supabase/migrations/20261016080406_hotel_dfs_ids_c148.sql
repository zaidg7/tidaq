-- C-148: Google Hotels ids (DataForSEO) for the hotels added after the first catalog (C-071a),
-- found with Hotel Searches in the hotel's own country and checked by name. They let the collector
-- ask Google for the exact final price of a Price Drop (taxes and fees included, as German
-- visitors see it; docs/research/exact-prices.md). Not found: Bvlgari Hotel Shanghai, Faena Miami
-- Beach, Mandarin Oriental Jumeira (their drops are not shown until they have an id).
update public.hotels h
   set dfs_hotel_identifier = v.id
  from (values
  ('1-hotel-south-beach-miami', 'ChoI4Nvv56-L5OPzARoNL2cvMTFiN2Z3NnI4ZxAB'),
  ('aman-tokyo', 'ChoIn5PqxN2MgdCaARoNL2cvMTFiNl96dzBkdBAB'),
  ('bairro-alto-hotel-lissabon', 'ChgIgIq5-Jq-qecMGgwvZy8xMTNocGxnaGgQAQ'),
  ('bvlgari-resort-dubai', 'ChkIyYry-aC5qateGg0vZy8xMWdjcXgzMnB5EAE'),
  ('capella-bangkok', 'ChkI6PGn4dK11JsyGg0vZy8xMWM2enpmeTZkEAE'),
  ('cheval-blanc-randheli-malediven', 'ChkIwt3h4djl6sX5ARoML2cvMWhjNXBtY2RrEAE'),
  ('crown-sydney', 'ChkI5L3w2vHg_spZGg0vZy8xMXFqNTBmMmN3EAE'),
  ('emirates-palace-mandarin-oriental-abu-dhabi', 'ChUIyIP1vb3LvadjGgkvbS8wOTIwcjcQAQ'),
  ('four-seasons-hotel-abu-dhabi-at-al-maryah-island', 'ChkI1P3ei5OBt-8zGg0vZy8xMWJ3eXcxX3Z6EAE'),
  ('four-seasons-hotel-bangkok-at-chao-phraya-river', 'ChoI6aqaz_TVqffFARoNL2cvMTFkeGs4bmdsNhAB'),
  ('four-seasons-hotel-istanbul-at-sultanahmet', 'ChoI_a6O1-mumuulARoNL2cvMTFiNzZndzludhAB'),
  ('four-seasons-hotel-madrid', 'ChkIoOX01Ki2v_R5Gg0vZy8xMWZodm5rNTRmEAE'),
  ('four-seasons-hotel-new-york', 'ChUI2O3FhPqiwPEYGgkvbS8wZ2JzcHoQAQ'),
  ('four-seasons-hotel-ritz-lisbon', 'ChcI8dPmtcCahZy7ARoKL20vMDR6amdqcxAB'),
  ('four-seasons-hotel-tokyo-at-otemachi', 'ChoInsHz6ta_r7bwARoNL2cvMTFmbjAzODU2MRAB'),
  ('four-seasons-resort-dubai-at-jumeirah-beach', 'ChkIicPzivm3nq2qARoML2cvMTJobHp5dzl2EAE'),
  ('hotel-bel-air-los-angeles', 'ChYI7YzF4aTZnIePARoJL20vMGcxbDNmEAE'),
  ('lowell-hotel-new-york', 'ChkI5pHe0aCz-Zx-Gg0vZy8xMWc3emYwOF9rEAE'),
  ('mandarin-oriental-bosphorus-istanbul', 'ChoIgf7QgYTAi4y5ARoNL2cvMTFneXd2cXdfaxAB'),
  ('mandarin-oriental-hong-kong', 'ChUI86nBq8i23qZxGgkvbS8wOGp0anIQAQ'),
  ('mandarin-oriental-ritz-madrid', 'ChgIhMO4yKyL6d25ARoLL20vMDExbGM1MWMQAQ'),
  ('marina-bay-sands-singapur', 'ChUI17vV0u_fprYCGgkvbS8wZGQ5MDMQAQ'),
  ('park-hyatt-sydney', 'ChgIu63hwebmwOiLARoLL2cvMXYxNnFnNGgQAQ'),
  ('park-hyatt-tokyo', 'ChcIlvu51MzyqOwsGgsvZy8xMjB5bGsyMxAB'),
  ('pullman-quay-grand-sydney-harbour', 'ChkIyvStgLGKq78uGg0vZy8xMWMxbjZ0aHY5EAE'),
  ('raffles-sentosa-singapore', 'ChkI1LSU_eD225oNGg0vZy8xMWx6cWpjODhrEAE'),
  ('raffles-singapore', 'ChUIwr3zstuIzr9kGgkvbS8wM2w2MzAQAQ'),
  ('rosewood-abu-dhabi', 'ChcI1ICnjrmVsKZ0GgsvZy8xMjJiZmo3MhAB'),
  ('rosewood-hong-kong', 'ChkIn6nG9enOloMtGg0vZy8xMWZkNDd5NDEzEAE'),
  ('santo-mauro-madrid', 'ChkIsrf7-8zk6twmGg0vZy8xMXNtd2cwcXY2EAE'),
  ('the-abu-dhabi-edition', 'ChoIpOq784b7rba9ARoNL2cvMTFnZF9iMmN0XxAB'),
  ('the-beverly-hills-hotel-los-angeles', 'ChYIyci1ypqwpajaARoJL20vMDh4eGZkEAE'),
  ('the-ivens-lissabon', 'ChoI1srNsp3WiJP5ARoNL2cvMTFnOHdqMXl5cxAB'),
  ('the-peninsula-beverly-hills-los-angeles', 'ChYIyNaqqL33x5ovGgovbS8wcDdjcHF2EAE'),
  ('the-peninsula-istanbul', 'ChkI4aLy0oCO_potGg0vZy8xMXRidmI2ZDA0EAE'),
  ('the-peninsula-shanghai', 'ChkI6rrB9eyVmLcSGg0vZy8xMWJ0d2tjcnA2EAE'),
  ('the-ritz-carlton-maldives-fari-islands', 'ChkIjc7Muv3hyLwnGg0vZy8xMW1iNThtaG02EAE'),
  ('the-ritz-carlton-new-york-central-park', 'ChgIqZuXw-DlyfncARoLL2cvMXRmam0wczMQAQ'),
  ('the-setai-miami-beach', 'ChYIz9u1gKOSzNBjGgovbS8wZnEwdmowEAE'),
  ('the-shanghai-edition', 'ChoImICVkdOE4MjyARoNL2cvMTFmNjYyeTdteRAB'),
  ('the-siam-bangkok', 'ChkI3s2k4fyFmKOCARoML2cvMTJqc3QwNDBoEAE'),
  ('the-st-regis-saadiyat-island-resort-abu-dhabi', 'ChcI-tmT8cuFtvfhARoKL20vMGdidzdxdBAB'),
  ('upper-house-hong-kong', 'ChgI6sqh7-3Ul6FcGgwvZy8xMXg3dnBnNjAQAQ'),
  ('waldorf-astoria-maldives-ithaafushi', 'ChkI0JOH0J3ZkJkVGg0vZy8xMWYwd203eGg4EAE')
  ) as v (slug, id)
 where h.slug = v.slug and h.dfs_hotel_identifier is null;
