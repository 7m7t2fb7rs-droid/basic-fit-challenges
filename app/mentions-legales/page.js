export const metadata = {
  title: "Mentions légales — Challenges Basic Fit",
};

/* Page statique : obligations de la LCEN (éditeur, hébergeur) et
   information des participants sur leurs données (RGPD). */
export default function MentionsLegalesPage() {
  return (
    <div className="legal">
      <div className="page-head">
        <h1>Mentions légales et confidentialité</h1>
        <p>Qui publie ce site, et ce qu’il fait des informations des participants.</p>
      </div>

      <section>
        <h2>Éditeur</h2>
        <p>
          Ce site est édité à titre non professionnel par l’équipe bénévole qui organise les
          challenges du club. Conformément à l’article 6, III, 2 de la loi n° 2004-575 du
          21 juin 2004 pour la confiance dans l’économie numérique, l’identité de l’éditeur a été
          communiquée à l’hébergeur.
        </p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Site hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
          (vercel.com). Les données du classement sont stockées chez Supabase Inc.
          (supabase.com).
        </p>
      </section>

      <section>
        <h2>Données des participants</h2>
        <p>Pour établir le classement, le site publie pour chaque participant :</p>
        <ul>
          <li>son prénom, et son nom uniquement s’il faut le distinguer d’un homonyme ;</li>
          <li>sa catégorie (hommes / femmes), pour les classements séparés ;</li>
          <li>ses performances et les points obtenus à chaque défi.</li>
        </ul>
        <p>
          Ces informations ne sont enregistrées qu’avec l’accord du participant, donné en
          s’inscrivant à un défi auprès de l’équipe. Elles sont conservées le temps de la saison
          de challenges, puis supprimées ou anonymisées. Elles ne sont ni vendues ni transmises à
          des tiers.
        </p>
        <p>
          Chacun peut à tout moment demander à consulter, corriger ou faire retirer ses
          informations du site&nbsp;: il suffit de le demander à l’équipe qui organise les
          challenges, à la salle. La demande est traitée dans un délai d’un mois au plus. En cas
          de désaccord, une réclamation peut être adressée à la CNIL (cnil.fr).
        </p>
      </section>

      <section>
        <h2>Propositions de défis</h2>
        <p>
          Les idées de défis envoyées depuis la page « Défis » sont anonymes : aucun nom,
          aucune adresse e-mail ni adresse IP n’est enregistré avec la proposition.
        </p>
      </section>

      <section>
        <h2>Cookies et mesure d’audience</h2>
        <p>
          Le site ne dépose aucun cookie publicitaire et n’utilise aucun outil de mesure
          d’audience. Le navigateur garde seulement l’heure du dernier envoi d’idée (pour éviter
          les doubles envois) et, pour l’équipe connectée, la session de l’espace admin. Ces
          éléments sont nécessaires au fonctionnement du site et ne demandent pas de
          consentement.
        </p>
      </section>
    </div>
  );
}
