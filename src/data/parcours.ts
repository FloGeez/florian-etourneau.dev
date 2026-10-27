/** Parcours, du plus récent au plus ancien : les entreprises, et pour MaxDS ses missions chez les clients.
 * `annees` pilote le nombre d’oiseaux posés (un oiseau = deux mois) : sur les missions pour MaxDS, leur somme fait sa durée.
 * Ce qui court encore se calcule depuis sa date de début, au build. */
export interface Ligne {
  annees: number;
  periode: string;
  poste: string;
  boite: string;
}

export interface Poste extends Partial<Ligne> {
  periode: string;
  poste: string;
  boite: string;
  missions?: Ligne[];
}

const depuis = (debut: string) => (Date.now() - new Date(`${debut}-01`).getTime()) / (365.25 * 24 * 3600 * 1000);
const dixieme = (n: number) => Math.round(n * 10) / 10;

const missions: Ligne[] = [
  { annees: dixieme(depuis('2022-02')), periode: '2022 — auj.', poste: 'Lead dev & expert Angular', boite: 'BPGO' },
  { annees: 2, periode: '2020 — 2022', poste: 'Lead technique · Angular & Java', boite: 'G2S' },
  { annees: 1.3, periode: '2018 — 2019', poste: 'Développeur fullstack', boite: 'SIB' },
];

export const parcours: Poste[] = [
  { periode: '09/2018 — auj.', poste: `${Math.floor(depuis('2018-09'))} ans, ${missions.length} missions`, boite: 'MaxDS', missions },
  { annees: 3, periode: '2015 — 2018', poste: 'Lead développeur & relais Scrum Master', boite: 'OBS' },
  { annees: 1, periode: '2014 — 2015', poste: 'Concepteur-développeur en alternance', boite: 'SFR' },
];
