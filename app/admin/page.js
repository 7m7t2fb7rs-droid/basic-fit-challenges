"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  rankChallenge,
  METRIC_LABEL,
  STATUS_LABEL,
  GENDER_LABEL,
  displayName,
  indexParticipants,
  attachParticipants,
  matchParticipants,
  nameKey,
} from "@/lib/scoring";
import {
  fetchCountdownEnd,
  saveCountdownEnd,
  DEFAULT_COUNTDOWN_END,
} from "@/lib/settings";
import { invalidateData } from "@/lib/store";

/* ------------------------------------------------------------------ */
/*  Page admin : connexion + gestion des défis et des scores          */
/* ------------------------------------------------------------------ */
export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) return <p className="text-neutral-500">Chargement…</p>;
  if (!session) return <LoginForm />;
  return <Dashboard email={session.user.email} />;
}

/* ------------------------------ Login ----------------------------- */
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };

  return (
    <div className="login-panel">
      <p className="eyebrow">DANS LES COULISSES DU CLUB</p>
      <h1 className="text-2xl font-extrabold tracking-tight">Espace admin</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Connecte-toi pour gérer les défis et saisir les scores.
      </p>
      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="admin-email">Adresse e-mail</label>
        <input
          id="admin-email"
          autoComplete="username"
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <label htmlFor="admin-password">Mot de passe</label>
        <input
          id="admin-password"
          autoComplete="current-password"
          type="password"
          required
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-bf-orange px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="mt-3 text-xs text-neutral-400">
        Accès réservé à l’équipe qui organise les challenges.
      </p>
    </div>
  );
}

/* ---------------------------- Dashboard --------------------------- */
const TABS = [
  { key: "scores", label: "Scores" },
  { key: "challenges", label: "Défis" },
  { key: "participants", label: "Participants" },
  { key: "suggestions", label: "Suggestions" },
  { key: "countdown", label: "Compte à rebours" },
];

function Dashboard({ email }) {
  const [tab, setTab] = useState("scores");
  const [challenges, setChallenges] = useState([]);
  const [entries, setEntries] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Rechargement silencieux : on ne repasse pas par l'écran « Chargement… »,
  // sinon les formulaires en cours de saisie seraient démontés et vidés.
  const reload = useCallback(async () => {
    const [chRes, enRes, paRes, suRes] = await Promise.all([
      supabase.from("challenges").select("*").order("sort_order", { ascending: true }),
      supabase.from("entries").select("*"),
      supabase.from("participants").select("*"),
      supabase.from("suggestions").select("*").order("created_at", { ascending: false }),
    ]);
    const failed = chRes.error || enRes.error || paRes.error || suRes.error;
    setLoadError(failed ? failed.message : null);
    setChallenges(chRes.data || []);
    setEntries(enRes.data || []);
    setParticipants(paRes.data || []);
    setSuggestions(suRes.data || []);
    setLoading(false);
    // Le classement public garde ses données en mémoire : après une saisie,
    // il doit les relire plutôt que de resservir l'état d'avant.
    invalidateData();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Pastille sur l'onglet : le nombre de propositions non encore traitées.
  const pending = suggestions.filter((x) => x.status === "new").length;

  return (
    <div className="admin-dashboard">
      <div className="admin-head">
        <div>
          <h1>Espace admin</h1>
          <p className="admin-who">Connecté : {email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="admin-signout">
          Déconnexion
        </button>
      </div>

      <nav className="admin-tabs" aria-label="Sections de l’administration">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={tab === key ? "active" : ""}
          >
            {label}
            {key === "suggestions" && pending > 0 && (
              <span className="tab-badge">{pending}</span>
            )}
          </button>
        ))}
      </nav>

      {loadError && (
        <p className="admin-alert">Données incomplètes : {loadError}</p>
      )}

      {loading ? (
        <p className="text-neutral-500">Chargement…</p>
      ) : (
        <>
          {tab === "scores" && (
            <ScoresManager
              challenges={challenges}
              entries={entries}
              participants={participants}
              onChange={reload}
            />
          )}
          {tab === "challenges" && (
            <ChallengesManager challenges={challenges} onChange={reload} />
          )}
          {tab === "participants" && (
            <ParticipantsManager
              participants={participants}
              entries={entries}
              onChange={reload}
            />
          )}
          {tab === "suggestions" && (
            <SuggestionsManager suggestions={suggestions} onChange={reload} />
          )}
          {tab === "countdown" && <CountdownManager />}
        </>
      )}
    </div>
  );
}

/* ------------------ Suggestions de défis (anonymes) ---------------- */
/*  Déposées depuis la page publique. Personne d'autre que les admins    */
/*  ne peut les lire : la table n'autorise pas la lecture au visiteur.   */
const SUGGESTION_STATUS = {
  new: { label: "À trier", cls: "sug-new" },
  kept: { label: "Retenue", cls: "sug-kept" },
  declined: { label: "Écartée", cls: "sug-declined" },
};

function SuggestionsManager({ suggestions, onChange }) {
  const [filter, setFilter] = useState("new");

  const counts = {
    new: suggestions.filter((x) => x.status === "new").length,
    kept: suggestions.filter((x) => x.status === "kept").length,
    declined: suggestions.filter((x) => x.status === "declined").length,
  };
  const shown = suggestions.filter((x) => x.status === filter);

  const setStatus = async (id, status) => {
    const { error } = await supabase.from("suggestions").update({ status }).eq("id", id);
    if (error) return alert(error.message);
    onChange();
  };

  const remove = async (id) => {
    if (!confirm("Supprimer définitivement cette proposition ?")) return;
    const { error } = await supabase.from("suggestions").delete().eq("id", id);
    if (error) return alert(error.message);
    onChange();
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Suggestions de défis</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Déposées anonymement depuis la page des défis. Aucune information sur
        l’auteur n’est enregistrée — inutile de chercher qui a proposé quoi.
      </p>

      <div className="sug-filters">
        {Object.entries(SUGGESTION_STATUS).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={filter === key ? "active" : ""}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">
          {filter === "new"
            ? "Aucune proposition en attente."
            : `Aucune proposition dans « ${SUGGESTION_STATUS[filter].label} ».`}
        </p>
      ) : (
        <ul className="sug-list">
          {shown.map((x) => (
            <li key={x.id} className="sug-item">
              <div className="sug-item-head">
                <strong>{x.title}</strong>
                <span className={`sug-badge ${SUGGESTION_STATUS[x.status].cls}`}>
                  {SUGGESTION_STATUS[x.status].label}
                </span>
              </div>
              {x.details && <p className="sug-details">{x.details}</p>}
              <div className="sug-item-foot">
                <span className="sug-date">
                  {new Date(x.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <div className="sug-actions">
                  {x.status !== "kept" && (
                    <button type="button" onClick={() => setStatus(x.id, "kept")}>
                      Retenir
                    </button>
                  )}
                  {x.status !== "declined" && (
                    <button type="button" onClick={() => setStatus(x.id, "declined")}>
                      Écarter
                    </button>
                  )}
                  {x.status !== "new" && (
                    <button type="button" onClick={() => setStatus(x.id, "new")}>
                      Remettre à trier
                    </button>
                  )}
                  <button type="button" className="danger" onClick={() => remove(x.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------- Date de fin du compte à rebours (accueil) ---------- */
function CountdownManager() {
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const v = await fetchCountdownEnd();
      setDate(v);
      setSaved(v);
      setLoading(false);
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setMsg(null);
    const { error } = await saveCountdownEnd(date);
    setBusy(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }
    setSaved(date);
    setMsg({ type: "ok", text: "Date enregistrée ✓" });
  };

  const formatted = saved
    ? new Date(`${saved}T12:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Compte à rebours</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Date de fin affichée sur la page d&apos;accueil. Le décompte s&apos;arrête à
        23h59 ce jour-là.
      </p>

      {loading ? (
        <p className="text-sm text-neutral-400">Chargement…</p>
      ) : (
        <>
          <form onSubmit={save} className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-neutral-500">Date de fin</span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              disabled={busy || date === saved}
              className="rounded-lg bg-bf-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "…" : "Enregistrer"}
            </button>
            {date !== saved && (
              <button
                type="button"
                onClick={() => setDate(saved)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-100"
              >
                Annuler
              </button>
            )}
          </form>

          <p className="mt-3 text-sm text-neutral-500">
            Actuellement : <span className="font-semibold text-bf-dark">{formatted}</span>
          </p>
          {msg && (
            <p
              className={`mt-2 text-sm ${
                msg.type === "ok" ? "text-green-600" : "text-red-600"
              }`}
            >
              {msg.text}
              {msg.type === "error" && (
                <span className="block text-xs text-neutral-500">
                  Si la table « settings » n&apos;existe pas encore, exécute
                  supabase-settings.sql dans Supabase. (Valeur par défaut :{" "}
                  {DEFAULT_COUNTDOWN_END})
                </span>
              )}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ----------------------- Gestion des défis ------------------------ */
function ChallengesManager({ challenges, onChange }) {
  const blank = {
    name: "",
    description: "",
    metric: "time",
    status: "upcoming",
    end_date: "",
    sort_order: (challenges.length + 1) * 10,
  };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, end_date: form.end_date || null };
    const { error } = await supabase.from("challenges").insert(payload);
    setBusy(false);
    if (error) return alert(error.message);
    setForm(blank);
    onChange();
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Défis</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Crée un défi, choisis s&apos;il se mesure en temps ou en répétitions, gère son statut.
      </p>

      <div className="space-y-2">
        {challenges.map((c) => (
          <ChallengeRow key={c.id} challenge={c} onChange={onChange} />
        ))}
      </div>

      {/* Nouveau défi */}
      <form
        onSubmit={create}
        className="mt-5 grid gap-2 rounded-xl border border-dashed border-neutral-300 p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2 text-sm font-semibold text-neutral-700">
          Nouveau défi
        </div>
        <input
          required
          placeholder="Nom (ex. Pompes)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Description (optionnel)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Mesuré en</span>
          <select
            value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="time">Temps (mm:ss)</option>
            <option value="reps">Répétitions (nombre)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Statut</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="upcoming">À venir</option>
            <option value="active">En cours</option>
            <option value="finished">Terminé</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Date de fin</span>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Ordre d&apos;affichage</span>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) =>
              setForm({ ...form, sort_order: Number(e.target.value) })
            }
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            disabled={busy}
            className="rounded-lg bg-bf-orange px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Ajout…" : "Ajouter le défi"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ChallengeRow({ challenge, onChange }) {
  const [edit, setEdit] = useState(false);
  const [c, setC] = useState({
    ...challenge,
    end_date: challenge.end_date || "",
    description: challenge.description || "",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { id, created_at, ...rest } = c;
    const { error } = await supabase
      .from("challenges")
      .update({ ...rest, end_date: rest.end_date || null })
      .eq("id", challenge.id);
    setBusy(false);
    if (error) return alert(error.message);
    setEdit(false);
    onChange();
  };

  const remove = async () => {
    if (!confirm(`Supprimer le défi « ${challenge.name} » et tous ses scores ?`))
      return;
    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", challenge.id);
    if (error) return alert(error.message);
    onChange();
  };

  if (!edit) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
        <span className="font-semibold">{challenge.name}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
          {METRIC_LABEL[challenge.metric]}
        </span>
        <span className="rounded-full bg-bf-light px-2 py-0.5 text-xs text-bf-dark">
          {STATUS_LABEL[challenge.status]}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setEdit(true)}
            className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-semibold hover:bg-neutral-100"
          >
            Modifier
          </button>
          <button
            onClick={remove}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-xl border border-bf-orange/40 bg-bf-light/40 p-3 sm:grid-cols-2">
      <input
        value={c.name}
        onChange={(e) => setC({ ...c, name: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        value={c.description}
        placeholder="Description"
        onChange={(e) => setC({ ...c, description: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <select
        value={c.metric}
        onChange={(e) => setC({ ...c, metric: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="time">Temps (mm:ss)</option>
        <option value="reps">Répétitions (nombre)</option>
      </select>
      <select
        value={c.status}
        onChange={(e) => setC({ ...c, status: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="upcoming">À venir</option>
        <option value="active">En cours</option>
        <option value="finished">Terminé</option>
      </select>
      <input
        type="date"
        value={c.end_date}
        onChange={(e) => setC({ ...c, end_date: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        type="number"
        value={c.sort_order}
        onChange={(e) => setC({ ...c, sort_order: Number(e.target.value) })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2 sm:col-span-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-bf-orange px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "…" : "Enregistrer"}
        </button>
        <button
          onClick={() => setEdit(false)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

/* --------------------- Fiches des participants -------------------- */
/*  Une personne = une fiche. Le prénom seul suffit ; le nom de famille
    ne sert qu'à distinguer deux homonymes.                            */
function ParticipantsManager({ participants, entries, onChange }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", gender: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const scoreCount = (id) => entries.filter((e) => e.participant_id === id).length;
  const sorted = [...participants].sort((a, b) =>
    displayName(a).localeCompare(displayName(b), "fr")
  );

  // Même prénom + même nom qu'une fiche existante : on prévient sans bloquer,
  // c'est peut-être réellement deux personnes différentes.
  const duplicate = participants.find(
    (p) =>
      nameKey(p.first_name) === nameKey(form.first_name) &&
      nameKey(p.last_name) === nameKey(form.last_name)
  );
  const sameFirstName = participants.filter(
    (p) => nameKey(p.first_name) === nameKey(form.first_name)
  );

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("participants").insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      gender: form.gender || null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setForm({ first_name: "", last_name: "", gender: "" });
    onChange();
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Participants</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Chaque personne a une fiche unique. Deux personnes du même prénom sont
        deux fiches distinctes — ajoute le nom de famille pour les différencier.
      </p>

      <div className="space-y-2">
        {sorted.map((p) => (
          <ParticipantRow
            key={p.id}
            participant={p}
            scores={scoreCount(p.id)}
            onChange={onChange}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-neutral-400">Aucune fiche pour l&apos;instant.</p>
        )}
      </div>

      <form
        onSubmit={create}
        className="mt-5 grid gap-2 rounded-xl border border-dashed border-neutral-300 p-4 sm:grid-cols-4"
      >
        <div className="text-sm font-semibold text-neutral-700 sm:col-span-4">
          Nouveau participant
        </div>
        <input
          required
          placeholder="Prénom"
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Nom (si homonyme)"
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Genre —</option>
          <option value="H">H — {GENDER_LABEL.H}</option>
          <option value="F">F — {GENDER_LABEL.F}</option>
        </select>
        <button
          disabled={busy || !form.first_name.trim()}
          className="rounded-lg bg-bf-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "…" : "Créer la fiche"}
        </button>

        {form.first_name.trim() && sameFirstName.length > 0 && (
          <p className="sm:col-span-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {duplicate ? (
              <>
                <span className="font-semibold">
                  {displayName(duplicate)} existe déjà
                </span>{" "}
                ({scoreCount(duplicate.id)} score
                {scoreCount(duplicate.id) > 1 ? "s" : ""}). Si c&apos;est une
                autre personne, distingue-les par le nom de famille.
              </>
            ) : (
              <>
                Déjà{" "}
                <span className="font-semibold">
                  {sameFirstName.map((p) => displayName(p)).join(", ")}
                </span>{" "}
                avec ce prénom. Ajoute un nom de famille pour éviter la confusion.
              </>
            )}
          </p>
        )}
        {err && <p className="sm:col-span-4 text-sm text-red-600">{err}</p>}
      </form>
    </section>
  );
}

function ParticipantRow({ participant, scores, onChange }) {
  const [edit, setEdit] = useState(false);
  const [p, setP] = useState({
    first_name: participant.first_name,
    last_name: participant.last_name || "",
    gender: participant.gender || "",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("participants")
      .update({
        first_name: p.first_name.trim(),
        last_name: p.last_name.trim() || null,
        gender: p.gender || null,
      })
      .eq("id", participant.id);
    setBusy(false);
    if (error) return alert(error.message);
    setEdit(false);
    onChange();
  };

  const remove = async () => {
    const warn = scores
      ? `Supprimer ${displayName(participant)} ET ses ${scores} score${
          scores > 1 ? "s" : ""
        } ?`
      : `Supprimer la fiche de ${displayName(participant)} ?`;
    if (!confirm(warn)) return;
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", participant.id);
    if (error) return alert(error.message);
    onChange();
  };

  if (!edit) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
        <span className="font-semibold">{displayName(participant)}</span>
        {participant.gender ? (
          <span
            title={GENDER_LABEL[participant.gender]}
            className="rounded-full bg-bf-light px-2 py-0.5 text-xs font-bold text-bf-dark"
          >
            {participant.gender}
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            genre à renseigner
          </span>
        )}
        <span className="text-xs text-neutral-400">
          {scores} score{scores > 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setEdit(true)}
            className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-semibold hover:bg-neutral-100"
          >
            Modifier
          </button>
          <button
            onClick={remove}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-xl border border-bf-orange/40 bg-bf-light/40 p-3 sm:grid-cols-3">
      <input
        value={p.first_name}
        placeholder="Prénom"
        onChange={(e) => setP({ ...p, first_name: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        value={p.last_name}
        placeholder="Nom (si homonyme)"
        onChange={(e) => setP({ ...p, last_name: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <select
        value={p.gender}
        onChange={(e) => setP({ ...p, gender: e.target.value })}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="">Genre —</option>
        <option value="H">H — {GENDER_LABEL.H}</option>
        <option value="F">F — {GENDER_LABEL.F}</option>
      </select>
      <div className="flex gap-2 sm:col-span-3">
        <button
          onClick={save}
          disabled={busy || !p.first_name.trim()}
          className="rounded-lg bg-bf-orange px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "…" : "Enregistrer"}
        </button>
        <button
          onClick={() => setEdit(false)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ------------- Sélection du participant à la saisie d'un score ------ */
/*  Tape un prénom : les fiches existantes remontent avec leurs scores,
    pour être sûr de ne pas confondre deux personnes ni saisir deux fois
    la même.                                                            */
function ParticipantPicker({
  participants,
  entries,
  challenges,
  selectedChallengeId,
  value,
  onChange,
  onCreated,
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(null); // { first_name, last_name, gender }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Quand le parent remet la sélection à zéro (score ajouté), on repart
  // d'une recherche vide plutôt que de rester sur l'ancien prénom tapé.
  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  const picked = participants.find((p) => p.id === value) || null;
  const matches = picked ? [] : matchParticipants(participants, query).slice(0, 6);
  const noMatch = !picked && query.trim() && matches.length === 0;

  const scoresOf = (id) => entries.filter((e) => e.participant_id === id);
  const chName = (id) => challenges.find((c) => c.id === id)?.name || "défi supprimé";

  // Le vrai piège : saisir deux fois la même personne sur le même défi.
  const already = picked
    ? scoresOf(picked.id).find((e) => e.challenge_id === selectedChallengeId)
    : null;

  const startCreate = () => {
    const parts = query.trim().split(/\s+/);
    setCreating({
      first_name: parts[0] || "",
      last_name: parts.slice(1).join(" "),
      gender: "",
    });
  };

  const create = async () => {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from("participants")
      .insert({
        first_name: creating.first_name.trim(),
        last_name: creating.last_name.trim() || null,
        gender: creating.gender || null,
      })
      .select()
      .single();
    setBusy(false);
    if (error) return setErr(error.message);
    setCreating(null);
    setQuery("");
    // On attend le rechargement : sinon la fiche tout juste créée n'est pas
    // encore dans la liste et le panneau clignote sur « aucune correspondance ».
    await onCreated?.();
    onChange(data.id);
  };

  if (picked) {
    const list = scoresOf(picked.id);
    return (
      <div className="rounded-xl border border-bf-orange/40 bg-bf-light/30 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{displayName(picked)}</span>
          {picked.gender ? (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-bf-dark">
              {picked.gender}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              genre à renseigner
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="ml-auto text-xs font-semibold text-neutral-500 hover:underline"
          >
            Changer
          </button>
        </div>

        {already && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">Attention :</span> cette personne a
            déjà un score sur ce défi ({already.raw_value}). Modifie-le plutôt
            que d&apos;en ajouter un second.
          </p>
        )}

        <div className="mt-2 text-sm">
          <span className="text-neutral-500">
            {list.length === 0
              ? "Aucun score enregistré pour l'instant."
              : `Scores déjà enregistrés (${list.length}) :`}
          </span>
          {list.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {list.map((e) => (
                <li key={e.id} className="flex gap-2 text-neutral-600">
                  <span className="text-neutral-400">{chName(e.challenge_id)}</span>
                  <span className="font-semibold">{e.raw_value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="grid gap-2 rounded-xl border border-bf-orange/40 bg-bf-light/30 p-3 sm:grid-cols-3">
        <div className="text-sm font-semibold text-neutral-700 sm:col-span-3">
          Nouvelle fiche
        </div>
        <input
          autoFocus
          placeholder="Prénom"
          value={creating.first_name}
          onChange={(e) => setCreating({ ...creating, first_name: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Nom (si homonyme)"
          value={creating.last_name}
          onChange={(e) => setCreating({ ...creating, last_name: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          value={creating.gender}
          onChange={(e) => setCreating({ ...creating, gender: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Genre —</option>
          <option value="H">H — {GENDER_LABEL.H}</option>
          <option value="F">F — {GENDER_LABEL.F}</option>
        </select>
        {err && <p className="text-sm text-red-600 sm:col-span-3">{err}</p>}
        <div className="flex gap-2 sm:col-span-3">
          <button
            type="button"
            onClick={create}
            disabled={busy || !creating.first_name.trim()}
            className="rounded-lg bg-bf-orange px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Créer et sélectionner"}
          </button>
          <button
            type="button"
            onClick={() => setCreating(null)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-100"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tape un prénom…"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:w-72"
      />

      {matches.length > 0 && (
        <ul className="mt-1 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
          {matches.map((p) => {
            const n = scoresOf(p.id).length;
            const dup = scoresOf(p.id).some(
              (e) => e.challenge_id === selectedChallengeId
            );
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onChange(p.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bf-light/50"
                >
                  <span className="font-semibold">{displayName(p)}</span>
                  {p.gender && (
                    <span className="rounded-full bg-neutral-100 px-1.5 text-xs font-bold text-neutral-500">
                      {p.gender}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-neutral-400">
                    {n} score{n > 1 ? "s" : ""}
                    {dup && (
                      <span className="ml-1 font-semibold text-amber-600">
                        · déjà sur ce défi
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {noMatch && (
        <div className="mt-1 rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-sm">
          <span className="text-neutral-500">Aucune fiche ne correspond.</span>
          <button
            type="button"
            onClick={startCreate}
            className="ml-2 font-semibold text-bf-dark hover:underline"
          >
            Créer « {query.trim()} »
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------- Gestion des scores ------------------------ */
function ScoresManager({ challenges, entries, participants, onChange }) {
  const sorted = [...challenges].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return 0;
  });
  const [selectedId, setSelectedId] = useState(sorted[0]?.id || "");
  const [participantId, setParticipantId] = useState("");
  const [value, setValue] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const selected = sorted.find((c) => c.id === selectedId);
  const chEntries = entries.filter((e) => e.challenge_id === selectedId);
  const byId = indexParticipants(participants);
  const ranked = selected
    ? rankChallenge(attachParticipants(chEntries, byId), selected.metric)
    : [];

  const validate = (raw, metric) => {
    if (metric === "time" && !/^\d+:[0-5]\d$/.test(raw.trim()))
      return "Format temps invalide — utilise mm:ss (ex: 2:40)";
    if (metric === "reps" && !/^\d+$/.test(raw.trim()))
      return "Nombre de répétitions invalide — utilise un entier (ex: 42)";
    return null;
  };

  const add = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!participantId) {
      setFormError("Choisis un participant.");
      return;
    }
    const err = validate(value, selected.metric);
    if (err) { setFormError(err); return; }
    setFormError(null);
    setBusy(true);
    const { error } = await supabase.from("entries").insert({
      challenge_id: selectedId,
      participant_id: participantId,
      raw_value: value.trim(),
      verified_by: verifiedBy.trim() || null,
    });
    setBusy(false);
    if (error) { setFormError(error.message); return; }
    setParticipantId("");
    setValue("");
    setVerifiedBy("");
    onChange();
  };

  const remove = async (id, who) => {
    if (!confirm(`Supprimer le score de « ${who} » ?`)) return;
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) return alert(error.message);
    onChange();
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Scores des participants</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Choisis un défi, puis la personne. Le rang et les points se calculent seuls.
      </p>

      <label className="text-sm">
        <span className="mb-1 block text-neutral-500">Défi</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:w-72"
        >
          <option value="">— choisir —</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.status === "active" ? "⚡ " : ""}{c.name} ({METRIC_LABEL[c.metric]})
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <>
          <form onSubmit={add} className="mt-4 space-y-3">
            <div className="text-sm">
              <span className="mb-1 block text-neutral-500">Participant</span>
              <ParticipantPicker
                participants={participants}
                entries={entries}
                challenges={challenges}
                selectedChallengeId={selectedId}
                value={participantId}
                onChange={setParticipantId}
                onCreated={onChange}
              />
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-neutral-500">
                  {selected.metric === "time" ? "Temps (mm:ss)" : "Répétitions"}
                </span>
                <input
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={selected.metric === "time" ? "2:40" : "42"}
                  className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-neutral-500">Vérifié par</span>
                <input
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="Ton prénom"
                  className="w-36 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                disabled={busy}
                className="rounded-lg bg-bf-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "…" : "Ajouter"}
              </button>
            </div>
          </form>
          {formError && (
            <p className="mt-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-2 py-1">Rang</th>
                  <th className="px-2 py-1">Nom</th>
                  <th className="px-2 py-1">Perf</th>
                  <th className="px-2 py-1">Points</th>
                  <th className="px-2 py-1">Vérifié par</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <ScoreRow
                    key={r.id}
                    r={r}
                    metric={selected.metric}
                    participants={participants}
                    siblings={chEntries}
                    onSave={onChange}
                    onRemove={remove}
                  />
                ))}
                {ranked.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-neutral-400">
                      Aucune performance pour ce défi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* ----------------------- Ligne score éditable ---------------------- */
function ScoreRow({ r, metric, participants, siblings, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [rawValue, setRawValue] = useState(r.raw_value);
  const [participantId, setParticipantId] = useState(r.participant_id);
  const [verifiedBy, setVerifiedBy] = useState(r.verified_by || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const who = displayName(r.participant);

  const choices = [...(participants || [])].sort((a, b) =>
    displayName(a).localeCompare(displayName(b), "fr")
  );

  // Réattribuer à quelqu'un qui a déjà un score sur ce défi en créerait un
  // second pour la même personne : on bloque plutôt que de laisser passer.
  const clash = (siblings || []).find(
    (e) => e.id !== r.id && e.participant_id === participantId
  );

  const validate = (v) => {
    if (metric === "time" && !/^\d+:[0-5]\d$/.test(v.trim()))
      return "Format invalide (ex: 2:40)";
    if (metric === "reps" && !/^\d+$/.test(v.trim()))
      return "Nombre invalide (ex: 42)";
    return null;
  };

  const save = async () => {
    const e = validate(rawValue);
    if (e) { setErr(e); return; }
    if (clash) { setErr("Cette personne a déjà un score sur ce défi."); return; }
    setErr(null);
    setBusy(true);
    const { error } = await supabase
      .from("entries")
      .update({
        raw_value: rawValue.trim(),
        participant_id: participantId,
        verified_by: verifiedBy.trim() || null,
      })
      .eq("id", r.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditing(false);
    onSave();
  };

  const cancel = () => {
    setEditing(false);
    setRawValue(r.raw_value);
    setParticipantId(r.participant_id);
    setVerifiedBy(r.verified_by || "");
    setErr(null);
  };

  if (!editing) {
    return (
      <tr className="border-t border-neutral-100">
        <td className="px-2 py-1.5 font-bold text-neutral-500">{r.rank}</td>
        <td className="px-2 py-1.5 font-semibold">
          {who}
          {r.participant?.gender && (
            <span className="ml-1.5 text-xs font-bold text-neutral-400">
              {r.participant.gender}
            </span>
          )}
        </td>
        <td className="px-2 py-1.5 text-neutral-600">{r.raw_value}</td>
        <td className="text-bf-dark px-2 py-1.5 font-extrabold">{r.points}</td>
        <td className="px-2 py-1.5 text-neutral-400 italic">{r.verified_by || "—"}</td>
        <td className="px-2 py-1.5 text-right whitespace-nowrap">
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-bf-dark hover:underline mr-2"
          >
            Modifier
          </button>
          <button
            onClick={() => onRemove(r.id, who)}
            className="text-xs font-semibold text-red-500 hover:underline"
          >
            Suppr.
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-bf-orange/30 bg-bf-light/40">
      <td className="px-2 py-2 font-bold text-neutral-400">{r.rank}</td>
      <td className="px-2 py-2">
        <select
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          className="max-w-[10rem] rounded border border-neutral-300 px-1.5 py-1 text-sm"
        >
          {choices.map((p) => (
            <option key={p.id} value={p.id}>
              {displayName(p)}
            </option>
          ))}
        </select>
        {clash && (
          <p className="mt-0.5 text-xs font-semibold text-amber-600">
            déjà un score ici
          </p>
        )}
      </td>
      <td className="px-2 py-2">
        <input
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          placeholder={metric === "time" ? "2:40" : "42"}
          className="w-24 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
      </td>
      <td className="px-2 py-2 text-neutral-400">—</td>
      <td className="px-2 py-2">
        <input
          value={verifiedBy}
          onChange={(e) => setVerifiedBy(e.target.value)}
          placeholder="Prénom"
          className="w-24 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        <button
          onClick={save}
          disabled={busy || !!clash}
          className="text-xs font-semibold text-white bg-bf-orange rounded px-2 py-1 mr-1 disabled:opacity-60"
        >
          {busy ? "…" : "OK"}
        </button>
        <button
          onClick={cancel}
          className="text-xs font-semibold text-neutral-500 hover:underline"
        >
          Annuler
        </button>
      </td>
    </tr>
  );
}
