"use client";

import { useState } from "react";
import { useData } from "@/lib/store";
import { closedSeasons } from "@/lib/seasons";
import FinalBoard from "../FinalBoard";

/* Archive : le classement final de chaque saison clôturée. */
export default function SaisonsPage() {
  const { data, loading, error, refresh } = useData();
  const [filter, setFilter] = useState("all");
  const past = closedSeasons(data?.seasons);

  return (
    <>
      <div className="page-head home-head">
        <div>
          <h1>Saisons précédentes</h1>
          <p>Le classement final de chaque saison, tel qu’il était à la clôture.</p>
        </div>
        <div className="segmented" role="group" aria-label="Catégorie du classement">
          {[["all", "Tous"], ["H", "Hommes"], ["F", "Femmes"]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card empty" role="status">
          Chargement…
        </div>
      ) : error ? (
        <div className="card empty" role="alert">
          <strong>Les saisons n’ont pas pu être chargées.</strong>
          <button className="btn" style={{ marginTop: 14 }} onClick={() => refresh()}>
            Réessayer
          </button>
        </div>
      ) : past.length === 0 ? (
        <div className="card empty">
          <strong>Aucune saison terminée pour l’instant.</strong>
          Le classement final de la saison en cours apparaîtra ici à sa clôture.
        </div>
      ) : (
        <div className="challenges">
          {past.map((s) => (
            <FinalBoard key={s.id} season={s} filter={filter} />
          ))}
        </div>
      )}
    </>
  );
}
