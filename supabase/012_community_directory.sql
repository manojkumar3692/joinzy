-- Public community directory. Safe for a landing-only database or the full MVP schema.
begin;
create table if not exists public.communities(id text primary key,name text not null,city text not null,currency text not null check(currency in ('AED','INR')));
alter table public.communities add column if not exists area text;
alter table public.communities add column if not exists address text;
alter table public.communities add column if not exists source_url text;
insert into public.communities(id,name,city,currency,area,address,source_url) values
('altis-ashraya','Altis Ashraya','Chennai, India','INR','Mangadu','Kundrathur Main Road, Sri Pandian Nagar, Mangadu, Chennai, Tamil Nadu 600122','https://www.jllhomes.co.in/apartments-new/chennai/altis-ashraya'),
('osian-chlorophyll','Osian Chlorophyll','Chennai, India','INR','Porur','Porur Link Road, Porur, Chennai, Tamil Nadu 600116','https://www.waze.com/live-map/directions/in/tn/chennai/osian-chlorophyll?to=place.ChIJ22-bGQRhUjoRhj8DY9qmfLM'),
('brigade-el-dorado','Brigade El Dorado','Bengaluru, India','INR','Bagalur','Aerospace Park, Huvinayakanahalli, Bagalur, Bengaluru, Karnataka 562149','https://www.brigadeeldorado.com/location'),
('hiranandani-egattur','House of Hiranandani, Egattur','Chennai, India','INR','Egattur / OMR','5/63, Old Mahabalipuram Road, Egattur, Chennai, Tamil Nadu','https://www.houseofhiranandani.com/download/location_broucher/project_location/omr1.pdf'),
('brigade-gateway','Brigade Gateway','Bengaluru, India','INR','Malleswaram / Rajajinagar','Dr Rajkumar Road, Malleswaram–Rajajinagar, Bengaluru, Karnataka 560055','https://www.brigadegroup.com/contact-us'),
('prestige-lakeside','Prestige Lakeside Habitat','Bengaluru, India','INR','Varthur / Gunjur','Varthur–Sarjapur Road, Gunjur, Bengaluru, Karnataka 560087','https://www.groupmrg.com/lakeside-habitat.html')
on conflict(id) do update set name=excluded.name,city=excluded.city,area=excluded.area,address=excluded.address,source_url=excluded.source_url;
alter table public.communities enable row level security;
drop policy if exists community_directory_read on public.communities;
create policy community_directory_read on public.communities for select to anon,authenticated using(true);
grant select on public.communities to anon,authenticated;
commit;
