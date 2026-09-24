/** Parcours, du plus récent au plus ancien.
 * `annees` pilote le nombre d’oiseaux posés (un oiseau = deux mois). */
export interface Poste {
  annees: number;
  periode: string;
  poste: string;
  boite: string;
}

export const parcours: Poste[] = [
  { annees: 4.7, periode: '2022 — auj.', poste: 'Lead dev & expert Angular', boite: 'BPGO' },
  { annees: 2, periode: '2020 — 2022', poste: 'Lead technique · Angular & Java', boite: 'G2S' },
  { annees: 1.3, periode: '2018 — 2019', poste: 'Développeur fullstack', boite: 'SIB' },
  { annees: 3, periode: '2015 — 2018', poste: 'Lead développeur & relais Scrum Master', boite: 'OBS' },
  { annees: 1, periode: '2014 — 2015', poste: 'Concepteur-développeur en alternance', boite: 'SFR' },
];
