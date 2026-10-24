export const API = process.env.REACT_APP_API_URL || 'http://localhost/beaconmart-project/backend';

export const rm = (value) => 'RM ' + Number(value).toFixed(2);

export function getJSON(path) {
  return fetch(API + path, { credentials: 'include' }).then(res => res.json());
}

export function postJSON(path, body) {
  return fetch(API + path, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(res => res.json());
}
