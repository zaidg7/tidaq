-- C-050a: Trip.com approved Zaid's affiliate account (Alliance ID 11087826, site "Tidaq" 334094272)
-- on 21 Oct 2026. Every Trip.com link gets these two parameters (core `withAffiliate`, query
-- template), and the offer rows show "Partnerlink". Public IDs, not secrets: they are in every link.
update public.providers
   set affiliate_template = '?Allianceid=11087826&SID=334094272'
 where slug = 'trip-com';
