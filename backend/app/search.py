"""Full-text search over everything the board knows, including the writing.

The board could already filter cards by title and task text. It could not find a
sentence inside a `spec.md`, because the snapshot carries documents as metadata —
a size, a word count — and never their text. The documents this tool exists to
surface were the documents it could not search.

The engine is SQLite's FTS5, which is in the standard library and in the image
already: no dependency was added and nothing is fetched. The index lives in
memory and is rebuilt with every scan. An index *file* would have been the first
thing SpecDash ever wrote to disk, and the first principle says it writes nothing.
"""

from __future__ import annotations

import difflib
import logging
import re
import sqlite3
import time
from pathlib import Path

from .models import Feature, Project, SearchHit, SearchResult, Snapshot

log = logging.getLogger("specdash.search")

# Bodies above this are not indexed, matching the ceiling that already guards
# serving them.
MAX_INDEX_BYTES = 2_000_000

SNIPPET_TOKENS = 16
MAX_SUGGESTIONS = 3

KINDS = ("feature", "story", "task", "requirement", "checklist", "document")


def _terms(query: str) -> list[str]:
    """Split a query into terms, keeping anything the user quoted as one phrase."""
    out: list[str] = []
    for quoted, bare in re.findall(r'"([^"]*)"|(\S+)', query):
        text = (quoted or bare).strip()
        if text:
            out.append(text)
    return out


def escape(query: str) -> str:
    """Turn what a person typed into an FTS5 expression that means it literally.

    `read-only` is a thing to search for, not a subtraction: FTS5 reads `-` as
    syntax and raises on it. Wrapping each term in double quotes makes every
    punctuation mark inert, and the trailing `*` makes it a prefix match — so a
    half-typed word still finds the whole one.
    """
    parts = []
    for term in _terms(query):
        cleaned = term.replace('"', " ").strip()
        if not cleaned:
            continue
        # A term of pure punctuation tokenises to nothing and would make the
        # whole expression unsatisfiable rather than ignored.
        if not re.search(r"\w", cleaned, flags=re.UNICODE):
            continue
        parts.append(f'"{cleaned}"*')
    return " AND ".join(parts)


class Index:
    """One immutable index over one snapshot.

    Immutable on purpose: `Hub` swaps a finished index in with a single
    assignment, so a search arriving mid-rescan is answered by the previous one
    — complete and consistent — rather than by a half-built one.
    """

    def __init__(self) -> None:
        self.db = sqlite3.connect(":memory:", check_same_thread=False)
        self.db.executescript(
            """
            CREATE VIRTUAL TABLE docs USING fts5(
                title, subtitle, body,
                kind UNINDEXED, project UNINDEXED, feature UNINDEXED,
                ref UNINDEXED, file UNINDEXED,
                tokenize='porter unicode61'
            );
            -- Titles and subtitles only, never document bodies. Measured:
            -- trigram-indexing 980 KB of prose costs 86 ms of a 105 ms build,
            -- and buys little — prose is what the token index above is for. A
            -- half-remembered substring is nearly always part of a name.
            -- Shares rowids with `docs`, so a hit maps straight back to its row.
            CREATE VIRTUAL TABLE grams USING fts5(body, tokenize='trigram');
            """
        )
        self.titles: list[str] = []
        self.vocabulary: set[str] = set()
        self.rows = 0
        self.built_ms = 0
        # Accumulated and inserted in two batches at the end: a row at a time
        # through the Python layer costs more than the indexing itself.
        self._pending: list[tuple] = []

    # -- building ----------------------------------------------------------

    def _add(
        self,
        *,
        kind: str,
        project: str,
        feature: str,
        ref: str,
        title: str,
        subtitle: str,
        body: str,
        file: str = "",
    ) -> None:
        self._pending.append((title, subtitle, body, kind, project, feature, ref, file))
        self.rows += 1
        if title:
            self.titles.append(title)
        for word in re.findall(r"\w{3,}", f"{title} {subtitle}", flags=re.UNICODE):
            self.vocabulary.add(word.lower())

    def seal(self) -> None:
        """Write the accumulated rows and make the index queryable."""
        self.db.executemany(
            "INSERT INTO docs (title, subtitle, body, kind, project, feature, ref, file)"
            " VALUES (?,?,?,?,?,?,?,?)",
            self._pending,
        )
        self.db.executemany(
            "INSERT INTO grams (rowid, body) VALUES (?,?)",
            [
                (position, f"{row[0]} {row[1]}")
                for position, row in enumerate(self._pending, start=1)
            ],
        )
        self._pending = []

    def add_feature(self, project: Project, feature: Feature, texts: dict[str, str]) -> None:
        where = f"{project.name} · {feature.number or feature.id}"
        self._add(
            kind="feature",
            project=project.id,
            feature=feature.id,
            ref=feature.id,
            title=feature.title,
            subtitle=where,
            body=" ".join(filter(None, [feature.summary, feature.input, feature.status])),
        )

        for story in feature.user_stories:
            self._add(
                kind="story",
                project=project.id,
                feature=feature.id,
                ref=story.id,
                title=story.title,
                subtitle=f"{story.id} · {feature.title}",
                body=" ".join(
                    filter(
                        None,
                        [story.why, story.narrative, story.independent_test]
                        + [a.text for a in story.acceptance],
                    )
                ),
            )

        for task in feature.tasks:
            self._add(
                kind="task",
                project=project.id,
                feature=feature.id,
                ref=task.id,
                title=task.description,
                subtitle=f"{task.id} · {task.phase}",
                body=" ".join(task.files),
            )

        for requirement in (*feature.requirements, *feature.success_criteria):
            self._add(
                kind="requirement",
                project=project.id,
                feature=feature.id,
                ref=requirement.id,
                title=requirement.text,
                subtitle=f"{requirement.id} · {feature.title}",
                body="",
            )

        for checklist in feature.checklists:
            for position, item in enumerate(checklist.items):
                self._add(
                    kind="checklist",
                    project=project.id,
                    feature=feature.id,
                    ref=f"{checklist.name}#{position}",
                    title=item.text,
                    subtitle=f"{checklist.name} · {feature.title}",
                    body=item.section or "",
                    file=checklist.file,
                )

        # The documents themselves — the part nothing could search before.
        for artifact in feature.artifacts:
            body = texts.get(artifact.file)
            if body is None:
                continue
            self._add(
                kind="document",
                project=project.id,
                feature=feature.id,
                ref=artifact.file,
                title=artifact.label,
                subtitle=f"{feature.title} · {project.name}",
                body=body,
                file=artifact.file,
            )

    # -- querying ----------------------------------------------------------

    def search(self, query: str, *, limit: int = 30, kind: str | None = None) -> SearchResult:
        started = time.perf_counter()
        expression = escape(query)
        if not expression:
            return SearchResult(query=query, hits=[], total=0, took_ms=0)

        hits = self._match(expression, limit=limit, kind=kind)
        used = "tokens"

        if not hits:
            # A substring inside a word — `ocket` in `websocket` — which a token
            # index cannot see however it is asked.
            hits = self._match_grams(query, limit=limit, kind=kind)
            used = "substring" if hits else "none"

        suggestions: list[str] = []
        if not hits:
            suggestions = self._did_you_mean(query)

        return SearchResult(
            query=query,
            hits=hits,
            total=len(hits),
            took_ms=round((time.perf_counter() - started) * 1000, 2),
            matched_by=used,
            suggestions=suggestions,
        )

    def _did_you_mean(self, query: str) -> list[str]:
        """Correct the words, not the whole phrase.

        Matching a mistyped query against entire titles rarely clears any
        threshold — `disagres taks` is nothing like `A spec that disagrees with
        its own task list`. Correcting term by term against the vocabulary the
        index actually holds is both likelier to fire and likelier to be right.
        """
        corrected: list[str] = []
        changed = False
        for term in _terms(query):
            lowered = term.lower()
            if lowered in self.vocabulary:
                corrected.append(term)
                continue
            close = difflib.get_close_matches(lowered, self.vocabulary, n=1, cutoff=0.72)
            if close:
                corrected.append(close[0])
                changed = True
            else:
                corrected.append(term)
        if not changed:
            return []
        return [" ".join(corrected)][:MAX_SUGGESTIONS]

    def _match(self, expression: str, *, limit: int, kind: str | None) -> list[SearchHit]:
        sql = (
            "SELECT kind, project, feature, ref, file, title, subtitle,"
            "       snippet(docs, 2, '\x02', '\x03', '…', ?),"
            "       bm25(docs, 8.0, 4.0, 1.0)"
            " FROM docs WHERE docs MATCH ?"
        )
        params: list[object] = [SNIPPET_TOKENS, expression]
        if kind:
            sql += " AND kind = ?"
            params.append(kind)
        sql += " ORDER BY bm25(docs, 8.0, 4.0, 1.0) LIMIT ?"
        params.append(limit)

        try:
            rows = self.db.execute(sql, params).fetchall()
        except sqlite3.OperationalError as exc:  # a query no escaping anticipated
            log.warning("search expression rejected: %s (%s)", expression, exc)
            return []
        return [self._hit(row) for row in rows]

    def _match_grams(self, query: str, *, limit: int, kind: str | None) -> list[SearchHit]:
        needle = query.strip().replace('"', " ").strip()
        if len(needle) < 3:  # trigram indexes cannot answer shorter than their name
            return []
        try:
            refs = self.db.execute(
                "SELECT rowid FROM grams WHERE grams MATCH ? LIMIT ?",
                (f'"{needle}"', limit * 4),
            ).fetchall()
        except sqlite3.OperationalError:
            return []
        if not refs:
            return []

        ids = [r[0] for r in refs]
        placeholders = ",".join("?" * len(ids))
        sql = (
            "SELECT kind, project, feature, ref, file, title, subtitle,"
            "       substr(body, 1, 160), 0.0"
            f" FROM docs WHERE rowid IN ({placeholders})"
        )
        params: list[object] = list(ids)
        if kind:
            sql += " AND kind = ?"
            params.append(kind)
        sql += " LIMIT ?"
        params.append(limit)
        return [self._hit(row) for row in self.db.execute(sql, params).fetchall()]

    @staticmethod
    def _hit(row: tuple) -> SearchHit:
        kind, project, feature, ref, file, title, subtitle, snippet, score = row
        # A snippet cut out of a markdown body arrives with its newlines and
        # indentation, which eat both lines of a two-line excerpt and show the
        # reader nothing. It is prose here, not layout.
        snippet = re.sub(r"\s+", " ", snippet or "").strip()
        return SearchHit(
            kind=kind,
            project_id=project,
            feature_id=feature,
            ref=ref,
            file=file or None,
            title=title,
            subtitle=subtitle,
            snippet=snippet,
            score=round(-float(score), 3),
        )


def build(snapshot: Snapshot, *, read=None) -> Index:
    """Index a snapshot, reading each feature's documents for their text.

    `read` is injectable so the tests can index without a filesystem; by default
    it is the same tolerant reader the scanner uses.
    """
    started = time.perf_counter()
    index = Index()

    def _default_read(path: Path) -> str:
        return path.read_text(encoding="utf-8", errors="replace")

    reader = read or _default_read

    for project in snapshot.projects:
        for feature in project.features:
            base = Path(project.path) / "specs" / feature.id
            texts: dict[str, str] = {}
            for artifact in feature.artifacts:
                if artifact.bytes > MAX_INDEX_BYTES:
                    continue
                try:
                    texts[artifact.file] = reader(base / artifact.file)
                except OSError:
                    continue  # unreadable here for the same reason it is unreadable there
            try:
                index.add_feature(project, feature, texts)
            except Exception as exc:  # one odd feature must not cost the whole index
                log.warning("not indexing %s/%s: %s", project.id, feature.id, exc)

    index.seal()
    index.built_ms = int((time.perf_counter() - started) * 1000)
    log.info("indexed %d row(s) in %d ms", index.rows, index.built_ms)
    return index
