/* API Utility */
const API = "/api";

async function api(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error("" + r.status);
  return r.json();
}

window.api = api;
window.API = API;
