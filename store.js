// Persistence behind one interface, so the page never talks to a backend directly.
// Reads stay synchronous off an in-memory cache; only hydrate and commit are async.
// LocalStore is today's behaviour: one JSON blob in localStorage, works from file://.
(function () {
  const KEY = "chess_path_to_v1";

  function blank() {
    return { sessions: [], games: [], blitz: {}, checks: {}, aagaard: [], variations: {} };
  }

  function localBackend(key) {
    return {
      name: "local",
      read: function () {
        try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
      },
      write: function (state) {
        // A full quota or a private window must not break the page; the cache stays correct.
        try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch (e) { return false; }
      }
    };
  }

  // `backend` is { name, read() -> state|Promise<state>, write(state) -> bool|Promise<bool> }.
  function create(backend) {
    let state = blank();
    let pending = null;
    return {
      backend: backend.name,
      // The same object for the life of the store: index.html keeps a local alias of it.
      get state() { return state; },
      hydrate: function () {
        return Promise.resolve(backend.read()).then(function (loaded) {
          Object.assign(state, blank(), loaded || {});
          return state;
        });
      },
      commit: function () {
        pending = Promise.resolve(backend.write(state)).then(function (ok) {
          pending = null;
          return ok !== false;
        });
        return pending;
      },
      settled: function () { return pending || Promise.resolve(true); }
    };
  }

  window.PathStore = {
    KEY: KEY,
    blank: blank,
    create: create,
    local: function (key) { return create(localBackend(key || KEY)); }
  };
})();
