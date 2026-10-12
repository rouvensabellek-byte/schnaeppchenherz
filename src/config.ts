// Nach dem Anlegen des GitHub-Repos hier Benutzername und Repo-Name eintragen.
// Solange GITHUB_USER leer ist, zeigt die App den mitgelieferten Datenstand.
export const GITHUB_USER = 'rouvensabellek-byte';
export const GITHUB_REPO = 'schnaeppchenherz';
export const BRANCH = 'main';

// Gleicher Wert wie das GitHub-Secret NTFY_TOPIC (für den Mystery-Box-Alarm)
export const NTFY_TOPIC = 'herz-fbd27d1c107154ad';

export const dataUrl = (file: string) =>
  GITHUB_USER ? `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/data/${file}` : null;
