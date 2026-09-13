def test_blank_shape(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    shape = page.evaluate("Object.keys(window.PathStore.blank()).sort()")
    assert shape == ["aagaard", "blitz", "checks", "games", "sessions", "variations"]


def test_hydrate_empty_storage_gives_blank(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    result = page.evaluate(
        """async () => {
            localStorage.clear();
            const store = window.PathStore.local();
            const state = await store.hydrate();
            return { games: state.games.length, backend: store.backend };
        }"""
    )
    assert result == {"games": 0, "backend": "local"}


def test_commit_then_hydrate_round_trips(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    games = page.evaluate(
        """async () => {
            localStorage.clear();
            const a = window.PathStore.local();
            await a.hydrate();
            a.state.games.push({ event: "test", result: "1-0" });
            await a.commit();
            const b = window.PathStore.local();
            const state = await b.hydrate();
            return state.games;
        }"""
    )
    assert games == [{"event": "test", "result": "1-0"}]


def test_state_identity_is_stable_across_commits(browser_page, harness_url):
    """index.html keeps a local alias of state; commit must not replace the object."""
    page = browser_page
    page.goto(harness_url)
    same = page.evaluate(
        """async () => {
            const store = window.PathStore.local();
            const first = await store.hydrate();
            await store.commit();
            return first === store.state;
        }"""
    )
    assert same is True


def test_unknown_keys_survive_hydrate(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    kept = page.evaluate(
        """async () => {
            localStorage.setItem(window.PathStore.KEY, JSON.stringify({ futureField: 42 }));
            const store = window.PathStore.local();
            const state = await store.hydrate();
            return state.futureField;
        }"""
    )
    assert kept == 42


def test_corrupt_storage_does_not_throw(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    games = page.evaluate(
        """async () => {
            localStorage.setItem(window.PathStore.KEY, "{not json");
            const store = window.PathStore.local();
            const state = await store.hydrate();
            return state.games.length;
        }"""
    )
    assert games == 0
    assert page.errors == []


def test_settled_resolves_after_commit(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    ok = page.evaluate(
        """async () => {
            const store = window.PathStore.local();
            await store.hydrate();
            store.commit();
            return await store.settled();
        }"""
    )
    assert ok is True
