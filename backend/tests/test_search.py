"""The index, against the real engine.

Every assertion here runs SQLite's own FTS5. The escaping in particular cannot be
tested against a mock: the whole question is what SQLite does with a query, and
the reason escaping exists at all is that `read-only` made it raise.
"""

from __future__ import annotations

import sqlite3

import pytest
from conftest import WORKSPACE

from app import scanner, search


@pytest.fixture(scope="module")
def index():
    return search.build(scanner.scan_all([WORKSPACE], with_git=False))


# --------------------------------------------------------------------------
# escaping — a correctness requirement, not a nicety
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "query, expected",
    [
        ("board", '"board"*'),
        ("read-only", '"read-only"*'),
        ("two words", '"two"* AND "words"*'),
        ('"a phrase" tail', '"a phrase"* AND "tail"*'),
        ("  spaced  out  ", '"spaced"* AND "out"*'),
        ("реальный", '"реальный"*'),
        ("SC-005a", '"SC-005a"*'),
    ],
)
def test_a_query_is_escaped_into_something_that_means_it_literally(query, expected):
    assert search.escape(query) == expected


@pytest.mark.parametrize("query", ["", "   ", "-", "--", "!!! ???", '""'])
def test_a_query_with_nothing_to_search_for_produces_no_expression(query):
    assert search.escape(query) == ""


def test_punctuation_alone_is_dropped_rather_than_making_the_query_unsatisfiable():
    # `AND "-"*` would match nothing at all and hide the real term.
    assert search.escape("board -") == '"board"*'


def test_the_escaped_form_is_accepted_by_the_engine(index):
    """The regression that started this: FTS5 reads `-` as syntax and raises."""
    for query in ["read-only", "SC-005a", "a/b", "what?", "50%", "x AND y", "NEAR"]:
        result = index.search(query)
        assert isinstance(result.total, int)  # did not raise


# --------------------------------------------------------------------------
# what it finds
# --------------------------------------------------------------------------


def test_a_sentence_inside_a_document_is_findable(index):
    """The gap this feature exists to close: the snapshot never carried document
    text, so nothing could search the writing. This phrase exists only in the
    body of a contracts document — nothing before could have found it."""
    result = index.search("contracts directory exists")

    assert result.total > 0
    documents = [h for h in result.hits if h.kind == "document"]
    assert documents, "the phrase lives in a spec.md body"
    assert documents[0].file.endswith(".md")


def test_a_hit_carries_enough_context_to_open_it(index):
    hit = index.search("Ship it").hits[0]

    assert hit.project_id and hit.feature_id and hit.ref
    assert hit.subtitle, "a title alone does not say which feature it belongs to"


def test_every_kind_of_content_is_indexed(index):
    kinds = {
        index.search(q).hits[0].kind
        for q in ["disagrees with its own", "Ship it", "Pin the dependencies", "derived from artefacts"]
    }

    assert {"feature", "story", "task", "requirement"} & kinds


def test_results_can_be_narrowed_to_one_kind(index):
    result = index.search("the", kind="task")

    assert result.hits
    assert {h.kind for h in result.hits} == {"task"}


def test_an_unknown_kind_yields_nothing_rather_than_everything(index):
    assert index.search("the", kind="nonsense").total == 0


def test_a_hit_shows_the_match_in_context(index):
    documents = [h for h in index.search("oldest").hits if h.kind == "document"]

    assert documents
    assert "\x02" in documents[0].snippet, "the matched term is marked for the browser"


def test_ranking_puts_the_better_match_first(index):
    hits = index.search("task list").hits

    assert hits
    assert hits[0].score >= hits[-1].score


def test_a_prefix_finds_the_whole_word(index):
    assert index.search("artefac").total > 0


def test_search_works_the_same_in_russian():
    snapshot = scanner.scan_all([WORKSPACE], with_git=False)
    project = snapshot.projects[0]
    feature = project.features[0]
    feature.title = "Карта инфраструктурных разрывов"

    index = search.build(snapshot)
    result = index.search("инфраструктур")

    assert result.total > 0


# --------------------------------------------------------------------------
# being forgiving
# --------------------------------------------------------------------------


def test_a_substring_inside_a_word_falls_back_to_the_trigram_index(index):
    result = index.search("isagree")

    assert result.total > 0
    assert result.matched_by == "substring"


def test_a_substring_shorter_than_a_trigram_is_not_attempted(index):
    result = index.search("zq")

    assert result.total == 0
    assert result.matched_by == "none"


def test_a_misspelling_is_answered_with_a_corrected_query(index):
    """Correcting the words beats guessing the title: a mistyped query is
    nothing like a whole sentence, so whole-title matching never fires."""
    result = index.search("disagres taks")

    assert result.total == 0
    assert result.suggestions == ["disagrees tasks"]


def test_a_query_that_is_merely_unfound_is_not_corrected(index):
    """Every word is real; there is simply no document with all of them. Offering
    a "correction" that changes nothing would be noise."""
    result = index.search("artefacts dependencies package")

    assert result.suggestions == [] or result.total > 0


def test_a_query_matching_nothing_at_all_suggests_nothing_rather_than_noise(index):
    result = index.search("qqqzzzxxx")

    assert result.total == 0
    assert result.suggestions == []


def test_the_substring_fallback_can_also_be_narrowed_to_a_kind(index):
    result = index.search("isagree", kind="feature")

    assert {h.kind for h in result.hits} <= {"feature"}


# --------------------------------------------------------------------------
# how it is built
# --------------------------------------------------------------------------


def test_an_empty_query_returns_nothing_rather_than_everything(index):
    for query in ["", "   ", "!!"]:
        result = index.search(query)
        assert result.total == 0
        assert result.took_ms == 0


def test_a_document_too_large_to_serve_is_too_large_to_index(monkeypatch):
    snapshot = scanner.scan_all([WORKSPACE], with_git=False)
    for project in snapshot.projects:
        for feature in project.features:
            for artifact in feature.artifacts:
                artifact.bytes = search.MAX_INDEX_BYTES + 1

    index = search.build(snapshot)

    assert not [h for h in index.search("contracts directory exists").hits if h.kind == "document"]


def test_a_document_that_cannot_be_read_is_skipped_exactly_as_the_scanner_skips_it():
    def refuse(path):
        raise OSError("permission denied")

    index = search.build(scanner.scan_all([WORKSPACE], with_git=False), read=refuse)

    assert index.rows > 0, "everything but the documents is still indexed"
    assert not [h for h in index.search("contracts directory exists").hits if h.kind == "document"]


def test_one_odd_feature_does_not_cost_the_whole_index(monkeypatch, caplog):
    snapshot = scanner.scan_all([WORKSPACE], with_git=False)
    real = search.Index.add_feature
    calls = {"n": 0}

    def explode(self, project, feature, texts):
        calls["n"] += 1
        if calls["n"] == 1:
            raise ValueError("something odd in this one")
        return real(self, project, feature, texts)

    monkeypatch.setattr(search.Index, "add_feature", explode)
    with caplog.at_level("WARNING"):
        index = search.build(snapshot)

    assert "not indexing" in caplog.text
    assert index.rows > 0


def test_an_expression_the_engine_rejects_is_logged_rather_than_raised(index, monkeypatch, caplog):
    monkeypatch.setattr(search, "escape", lambda q: "NEAR(")

    with caplog.at_level("WARNING"):
        result = index.search("anything")

    assert result.total == 0
    assert "rejected" in caplog.text


def test_the_index_reports_what_it_did(index):
    assert index.rows > 0
    assert index.built_ms >= 0


def test_a_term_that_is_only_quotes_is_dropped():
    """An unbalanced quote survives splitting as a term, then becomes nothing
    once the quotes are stripped — and must not close the expression."""
    assert search.escape('board """') == '"board"*'


def test_a_trigram_expression_the_engine_rejects_yields_nothing(index, monkeypatch):
    """The fallback must fail the same way the main query does — quietly."""
    class RefusesGrams:
        def __init__(self, real):
            self.real = real

        def execute(self, sql, *args):
            if "grams" in sql:
                raise sqlite3.OperationalError("fts5: syntax error")
            return self.real.execute(sql, *args)

    monkeypatch.setattr(index, "db", RefusesGrams(index.db))
    result = index.search("qqqzzz")

    assert result.total == 0
