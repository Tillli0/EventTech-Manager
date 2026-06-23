// EventTech Manager — Admin-Nutzerverwaltung (Edge Function)
//
// Legt Auth-Nutzer an / löscht sie / setzt Passwörter zurück. Das braucht den
// Service-Role-Key, der NIEMALS in den Browser darf — daher serverseitig hier.
// Der Aufrufer muss eingeloggt UND Admin sein (Prüfung über sein JWT + profiles.role).
//
// Lokal testen:  supabase functions serve admin-users
// Aufruf:        POST /functions/v1/admin-users  { action, ... }  mit Authorization: Bearer <user-jwt>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Nicht authentifiziert." }, 401);

    // 1) Aufrufer prüfen (mit dessen JWT) — ist er Admin?
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Ungültige Sitzung." }, 401);

    const { data: profile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile || profile.role !== "admin") {
      return json({ error: "Nur Administratoren dürfen Nutzer verwalten." }, 403);
    }

    // 2) Mit Service-Role die eigentliche Aktion ausführen.
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      const { email, password, full_name, role, areas } = body;
      if (!email || !password) return json({ error: "E-Mail und Passwort sind erforderlich." }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name ?? null },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Anlegen fehlgeschlagen." }, 400);

      const newId = created.user.id;
      // Profil existiert dank Trigger; Rolle + Bereiche setzen.
      const finalRole = role === "admin" ? "admin" : role === "verwaltung" ? "verwaltung" : "mitarbeiter";
      // Manager sehen standardmäßig alle Jobs, Mitarbeiter nur zugewiesene.
      const viewMode = finalRole === "mitarbeiter" ? "zugewiesene" : "alle";
      await admin
        .from("profiles")
        .update({ role: finalRole, full_name: full_name ?? null, job_view_mode: viewMode })
        .eq("id", newId);

      if (Array.isArray(areas) && areas.length > 0) {
        await admin.from("user_area_access").insert(
          areas.map((a: { area: string; can_edit?: boolean }) => ({
            user_id: newId,
            area: a.area,
            can_edit: !!a.can_edit,
          })),
        );
      }
      return json({ id: newId });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id fehlt." }, 400);
      if (user_id === userData.user.id) return json({ error: "Du kannst dich nicht selbst löschen." }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !password) return json({ error: "user_id und password sind erforderlich." }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: `Unbekannte Aktion: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Serverfehler." }, 500);
  }
});
