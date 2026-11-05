import { legacyCallbackRedirect } from '../../_lib/http.js';

export function onRequestGet({ request }) {
  return legacyCallbackRedirect(request, 'x');
}
