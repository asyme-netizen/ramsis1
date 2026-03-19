create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  page_type text not null,
  page_id text not null,
  page_title text,
  referrer text,
  visitor_id text,
  created_at timestamptz default now()
);

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text unique not null,
  source text default 'newsletter_form',
  created_at timestamptz default now()
);

create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  name text,
  email text,
  subject text,
  message text not null,
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists public.site_sections (
  id bigint generated always as identity primary key,
  name text not null,
  slug text unique not null,
  description text,
  is_visible boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

insert into public.site_sections (name, slug, description, is_visible, sort_order)
values
('التاريخ', 'history', 'ملفات الحضارات والوقائع التاريخية', true, 1),
('التكنولوجيا', 'technology', 'التحولات التقنية والمنصات والبنية الرقمية', true, 2),
('الذكاء الاصطناعي', 'artificial-intelligence', 'اتجاهات الذكاء الاصطناعي وتأثيره على العالم', true, 3),
('البزنس', 'business', 'الأسواق والإدارة ونماذج الأعمال', true, 4),
('الطب', 'medicine', 'الصحة والطب والابتكار الحيوي', true, 5),
('السير الذاتية', 'biographies', 'بروفايلات وشخصيات مؤثرة', true, 6),
('التحقيقات', 'investigations', 'ملفات معمقة وتحليلات استقصائية', true, 7)
on conflict (slug) do nothing;

alter table public.page_views enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_sections enable row level security;

drop policy if exists "allow select page_views" on public.page_views;
drop policy if exists "allow insert page_views" on public.page_views;
drop policy if exists "allow select newsletter_subscribers" on public.newsletter_subscribers;
drop policy if exists "allow insert newsletter_subscribers" on public.newsletter_subscribers;
drop policy if exists "allow select contact_messages" on public.contact_messages;
drop policy if exists "allow insert contact_messages" on public.contact_messages;
drop policy if exists "allow select site_sections" on public.site_sections;
drop policy if exists "allow insert site_sections" on public.site_sections;
drop policy if exists "allow update site_sections" on public.site_sections;
drop policy if exists "allow delete site_sections" on public.site_sections;

create policy "allow select page_views" on public.page_views for select to anon using (true);
create policy "allow insert page_views" on public.page_views for insert to anon with check (true);

create policy "allow select newsletter_subscribers" on public.newsletter_subscribers for select to anon using (true);
create policy "allow insert newsletter_subscribers" on public.newsletter_subscribers for insert to anon with check (true);

create policy "allow select contact_messages" on public.contact_messages for select to anon using (true);
create policy "allow insert contact_messages" on public.contact_messages for insert to anon with check (true);

create policy "allow select site_sections" on public.site_sections for select to anon using (true);
create policy "allow insert site_sections" on public.site_sections for insert to anon with check (true);
create policy "allow update site_sections" on public.site_sections for update to anon using (true) with check (true);
create policy "allow delete site_sections" on public.site_sections for delete to anon using (true);
