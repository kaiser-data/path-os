def test_aagaard_entry_survives_reload(browser_page, app_url):
    page = browser_page
    page.goto(app_url(tab="log"))
    page.wait_for_function("typeof window.pathLogAagaard === 'function'")
    page.evaluate(
        """async () => {
            await window.pathStore.settled();
            window.pathLogAagaard({
                date: "2026-09-13", chapter: 6, exercise: 1,
                minutes: 7, result: "short", ply: 3, note: "test"
            });
            await window.pathStore.settled();
        }"""
    )

    page.reload()
    page.wait_for_function("typeof window.pathLogAagaard === 'function'")
    entries = page.evaluate("window.pathStore.state.aagaard")

    assert len(entries) == 1
    assert entries[0]["exercise"] == 1
    assert entries[0]["ply"] == 3


def test_variation_survives_reload(browser_page, app_url):
    page = browser_page
    page.goto(app_url(tab="log"))
    page.wait_for_function("typeof window.pathVariations === 'object'")
    page.evaluate(
        """async () => {
            window.pathVariations.set("s1:step1", [{ moves: ["e4", "e5"], note: "n" }]);
            await window.pathStore.settled();
        }"""
    )

    page.reload()
    page.wait_for_function("typeof window.pathVariations === 'object'")
    lines = page.evaluate("window.pathVariations.get('s1:step1')")

    assert lines[0]["moves"] == ["e4", "e5"]


def test_store_is_local_backend_on_file_url(browser_page, app_url):
    page = browser_page
    page.goto(app_url())
    page.wait_for_function("window.pathStore !== undefined")
    assert page.evaluate("window.pathStore.backend") == "local"
    assert page.errors == []
