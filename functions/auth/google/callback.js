import { finishAuth } from '../../_lib/oauth.js';

export function onRequestGet(context) {
  return finishAuth(context, 'google');
}
