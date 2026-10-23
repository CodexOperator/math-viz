// One rising number for a loop that draws two pictures.
//
// The main picture and the companion both stamp a frame with the number from
// next(). A worker drops a frame whose number is older than the newest one it
// has been given. Each picture paints a finished frame only when its number is
// at least the last one that picture painted, so a late frame cannot rewind it.

export function createRenderEpoch() {
  let n = 0;
  return {
    current() { return n; },
    next() { return ++n; },
  };
}

// A worker runs a frame only when it is still the newest one, and not cancelled.
export function frameIsCurrent(token, latest, abandon) {
  return token === latest && token > abandon;
}
