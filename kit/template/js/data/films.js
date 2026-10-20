// Film list. Scaffold overwrites this from config.films. Empty until then.

export const FILMS = [];

export function filmsFor(stationId) {
  return FILMS.filter((film) => film.station === stationId);
}

export function filmById(id) {
  return FILMS.find((film) => film.id === id) || null;
}
