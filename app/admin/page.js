"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { rankChallenge, METRIC_LABEL, STATUS_LABEL } from "@/lib/scoring";

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
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-extrabold tracking-tight">Espace admin</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Connecte-toi pour gérer les défis et saisir les scores.
      </p>
      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
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
        Les comptes admin se créent dans Supabase (Authentication → Users → Add user).
      </p>
    </div>
  );
}

/* ---------------------------- Dashboard --------------------------- */
function Dashboard({ email }) {
  const [challenges, setChallenges] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data: ch } = await supabase
      .from("challenges")
      .select("*")
      .order("sort_order", { ascending: true });
    const { data: en } = await supabase.from("entries").select("*");
    setChallenges(ch || []);
    setEntries(en || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Espace admin</h1>
          <p className="text-sm text-neutral-500">Connecté : {email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="ml-auto rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-100"
        >
          Déconnexion
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-500">Chargement…</p>
      ) : (
        <>
          <ScoresManager
            challenges={challenges}
            entries={entries}
            onChange={reload}
          />
          <ChallengesManager challenges={challenges} onChange={reload} />
        </>
      )}
    </div>
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

/* ---------------------- Gestion des scores ------------------------ */
function ScoresManager({ challenges, entries, onChange }) {
  const [selectedId, setSelectedId] = useState(challenges[0]?.id || "");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = challenges.find((c) => c.id === selectedId);
  const chEntries = entries.filter((e) => e.challenge_id === selectedId);
  const ranked = selected ? rankChallenge(chEntries, selected.metric) : [];

  const add = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    const { error } = await supabase.from("entries").insert({
      challenge_id: selectedId,
      participant_name: name.trim(),
      raw_value: value.trim(),
    });
    setBusy(false);
    if (error) return alert(error.message);
    setName("");
    setValue("");
    onChange();
  };

  const remove = async (id) => {
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) return alert(error.message);
    onChange();
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Scores des participants</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Choisis un défi, ajoute une performance. Le rang et les points se calculent seuls.
      </p>

      <label className="text-sm">
        <span className="mb-1 block text-neutral-500">Défi</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:w-72"
        >
          <option value="">— choisir —</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({METRIC_LABEL[c.metric]})
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <>
          <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-neutral-500">Nom</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prénom / pseudo"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
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
            <button
              disabled={busy}
              className="rounded-lg bg-bf-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "…" : "Ajouter"}
            </button>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-2 py-1">Rang</th>
                  <th className="px-2 py-1">Nom</th>
                  <th className="px-2 py-1">Perf</th>
                  <th className="px-2 py-1">Points</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100">
                    <td className="px-2 py-1.5 font-bold text-neutral-500">{r.rank}</td>
                    <td className="px-2 py-1.5 font-semibold">{r.participant_name}</td>
                    <td className="px-2 py-1.5 text-neutral-600">{r.raw_value}</td>
                    <td className="text-bf-dark px-2 py-1.5 font-extrabold">{r.points}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))}
                {ranked.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-neutral-400">
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
