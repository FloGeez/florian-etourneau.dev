/* Rennes, en direct : l’heure, et le temps qu’il fait (Open-Meteo, sans clé). En cas d’échec, on n’affiche rien. */
export function initRennes() {
  const heure = document.getElementById('heure');
  const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  const tic = () => { heure.textContent = fmt.format(new Date()).replace(':', ' h '); };
  tic(); setInterval(tic, 15000);
  const meteo = document.getElementById('meteo'), temperature = document.getElementById('temperature');
  const releve = () => fetch('https://api.open-meteo.com/v1/forecast?latitude=48.11&longitude=-1.68&current=temperature_2m&timezone=Europe%2FParis')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j) => { const t = j && j.current && j.current.temperature_2m; if (typeof t !== 'number') return; temperature.textContent = `${Math.round(t)} °C`; meteo.hidden = false; })
    .catch(() => {});
  releve(); setInterval(releve, 15 * 60 * 1000);
}
