import { GENDER_LABEL } from "@/lib/scoring";

const dayMonthYear = (iso) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).replace(/^1 /, "1er ")
    : null;

/* Classement final d'une saison clôturée, tel qu'il a été figé à la
   clôture. Pas de fiche au clic : les défis de la saison ne bougent plus,
   le tableau se suffit à lui-même. */
export default function FinalBoard({ season, filter = "all", titleId, limit }) {
  if (!season) return null;
  const rows = season.final_board?.[filter] || [];
  const shown = limit ? rows.slice(0, limit) : rows;
  const from = dayMonthYear(season.start_date);
  const to = dayMonthYear(season.end_date);

  return (
    <div className="card board">
      <div className="board-head">
        <h2 id={titleId}>Classement final — {season.name}</h2>
        <p>
          {from && to ? `Du ${from} au ${to}` : "Saison terminée"}
          {season.final_board?.challenges ? ` · ${season.final_board.challenges} défis` : ""}
        </p>
      </div>
      {shown.length === 0 ? (
        <p className="empty">
          {filter === "all"
            ? "Aucun score cette saison."
            : `Personne dans la catégorie ${GENDER_LABEL[filter]} cette saison.`}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col" className="rank">#</th>
              <th scope="col">Participant</th>
              <th scope="col">Points</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p, i) => (
              <tr
                key={`${p.name}-${i}`}
                className={[p.rank <= 3 && "top", p.rank === 1 && "lead"].filter(Boolean).join(" ")}
              >
                <td className="rank">{p.rank}</td>
                <td className="name">{p.name}</td>
                <td className="pts">
                  {p.total}
                  <small>pts</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
