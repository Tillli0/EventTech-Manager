# Erst-Admin anlegen (Bootstrap)

Migration `0012_auth_roles_and_access.sql` schaltet RLS scharf — danach kommt man nur
noch mit einem eingeloggten Account an Daten. Der erste Admin wird **nicht** per SQL in
`auth.users` angelegt (zu fragil), sondern über die GoTrue-Admin-API. Nach jedem
`supabase db reset` müssen diese zwei Schritte einmal wiederholt werden.

Werte aus `supabase status` nehmen (`SERVICE_ROLE_KEY`, `API_URL`). Beispiel lokal:

```bash
# 1) Admin-Auth-Nutzer anlegen
SERVICE="<SERVICE_ROLE_KEY aus 'supabase status'>"
curl -s -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
  -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" \
  -d '{"email":"admin@eventtech.local","password":"EventTech2026!","email_confirm":true,"user_metadata":{"full_name":"Administrator"}}'

# 2) Rolle = admin + alle Bereiche freischalten (Trigger hat das Profil schon angelegt)
docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres <<'SQL'
update profiles set role='admin', full_name='Administrator'
  where id = (select id from auth.users where email='admin@eventtech.local');
insert into user_area_access (user_id, area, can_edit)
select u.id, a.area, true
from auth.users u
cross join (values ('inventar'::app_area),('jobs'),('kunden'),('angebote'),('kalender'),('aufgaben')) as a(area)
where u.email='admin@eventtech.local'
on conflict (user_id, area) do update set can_edit=excluded.can_edit;
SQL
```

## Standard-Zugang (lokal)

- **E-Mail:** `admin@eventtech.local`
- **Passwort:** `EventTech2026!` — **nach dem ersten Login ändern.**

Alle weiteren Nutzer legt der Admin danach im Admin-Dashboard der App an
(über die Edge Function `admin-users`, die den Service-Role-Key serverseitig nutzt).
