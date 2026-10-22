-- Non-personal demo content; apply once after schema.sql.
insert into public.communities values('wasl','Wasl Village','Dubai, UAE','AED'),('palm','Palm Meadows Society (sample)','Bengaluru, India','INR');
insert into public.deals(community_id,business_name,title,description,category,retail_minor,price_minor,deposit_minor,minimum,capacity,status,deadline,pickup) values
('wasl','Green Basket Farms','Fresh essentials, together','Farm-fresh fruit & vegetable box','Groceries',8900,5900,1500,12,30,'open',now()+interval '48 hours','Community clubhouse · Saturday, 10am–1pm'),
('wasl','Sparkle Home Services','A fresh start for your home','Professional 3-hour home cleaning','Home care',18000,11900,2500,8,16,'open',now()+interval '48 hours','Community clubhouse · Saturday, 10am–1pm'),
('wasl','Oasis Water','Good water. Better value.','Six 5-gallon drinking water bottles','Essentials',7200,4900,1000,10,40,'open',now()+interval '48 hours','Community clubhouse · Saturday, 10am–1pm'),
('palm','Orchard Collective','A little sunshine, by the box','Premium seasonal fruit box · 3 kg','Groceries',90000,64900,15000,10,24,'open',now()+interval '48 hours','Community clubhouse · Saturday, 10am–1pm'),
('palm','FreshFold','Your weekend, reclaimed','Wash & fold laundry · 5 kg','Home care',60000,39900,10000,8,20,'open',now()+interval '48 hours','Community clubhouse · Saturday, 10am–1pm');
-- Provision auth users separately; create profiles and memberships via service_role.
-- Attach each offer to its real business_id before enabling business operations.
