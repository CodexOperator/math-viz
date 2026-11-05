import { beginAuth } from '../../_lib/oauth.js';

export function onRequestGet(context) {
  return beginAuth(context, 'google');
}
