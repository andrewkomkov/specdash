"""Parsers for the markdown documents spec-kit produces.

These are deliberately tolerant: spec-kit templates drift between versions and
people edit the output by hand. Anything that cannot be recognised is skipped
rather than raised, so one odd file never blanks out a whole board.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .models import (
    AcceptanceScenario,
    Checklist,
    ChecklistItem,
    Phase,
    Requirement,
    Task,
    UserStory,
)

# --------------------------------------------------------------------------
# generic markdown helpers
# --------------------------------------------------------------------------

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*$")
BOLD_FIELD_RE = re.compile(r"^\*\*(.+?)\*\*\s*:\s*(.*)$")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
NEEDS_CLARIFICATION_RE = re.compile(r"\[NEEDS CLARIFICATION:?\s*([^\]]*)\]", re.I)
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)


def strip_frontmatter(text: str) -> str:
    return FRONTMATTER_RE.sub("", text, count=1)


def clean_inline(text: str) -> str:
    """Flatten markdown emphasis and links into readable plain text."""
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"\1", text)
    text = text.replace("`", "")
    return re.sub(r"\s+", " ", text).strip()


@dataclass
class Section:
    level: int
    title: str
    lines: list[str] = field(default_factory=list)
    start: int = 0

    @property
    def text(self) -> str:
        return "\n".join(self.lines)

    def paragraphs(self) -> list[str]:
        """Body prose, wrapped lines joined and emphasis flattened.

        `**Acceptance Scenarios**:` and its siblings are metadata, not prose: a
        story with no narrative would otherwise take one as its summary and print
        the asterisks on the card. Everything else on screen goes through
        `clean_inline`; paragraphs did not, which is why summaries carried raw
        `**bold**` markers into the UI.
        """
        out: list[str] = []
        buf: list[str] = []

        def flush() -> None:
            nonlocal buf
            if buf:
                text = clean_inline(" ".join(buf))
                if text:
                    out.append(text)
                buf = []

        for raw in self.lines:
            line = raw.rstrip()
            if not line.strip():
                flush()
                continue
            if (
                line.lstrip().startswith(("- ", "* ", "|", ">", "#"))
                or re.match(r"^\s*\d+\.\s", line)
                or BOLD_FIELD_RE.match(line.strip())
            ):
                flush()
                continue
            buf.append(line.strip())
        flush()
        return out

    def field(self, name: str) -> str | None:
        """Value of a `**Name**: value` line, including its wrapped continuation."""
        want = name.lower().rstrip(":")
        for i, raw in enumerate(self.lines):
            m = BOLD_FIELD_RE.match(raw.strip())
            if not m or m.group(1).lower().rstrip(":") != want:
                continue
            parts = [m.group(2).strip()]
            for cont in self.lines[i + 1 :]:
                s = cont.strip()
                if not s or BOLD_FIELD_RE.match(s) or s.startswith(("#", "- ", "* ", "|")):
                    break
                parts.append(s)
            value = clean_inline(" ".join(parts))
            return value or None
        return None

    def bullets(self) -> list[str]:
        """Top-level bullets, with wrapped continuation lines folded in."""
        out: list[str] = []
        cur: list[str] | None = None
        for raw in self.lines:
            line = raw.rstrip()
            stripped = line.strip()
            m = re.match(r"^[-*]\s+(.*)$", stripped)
            indent = len(line) - len(line.lstrip())
            if m and indent == 0:
                if cur:
                    out.append(" ".join(cur))
                cur = [m.group(1)]
            elif cur is not None and stripped and indent > 0 and not re.match(r"^[-*]\s", stripped):
                cur.append(stripped)
            elif not stripped:
                if cur:
                    out.append(" ".join(cur))
                    cur = None
        if cur:
            out.append(" ".join(cur))
        return [clean_inline(b) for b in out if clean_inline(b)]


def split_sections(text: str) -> list[Section]:
    """Split a document into heading-delimited sections (preamble first)."""
    sections = [Section(level=0, title="", start=0)]
    for i, line in enumerate(strip_frontmatter(text).splitlines()):
        m = HEADING_RE.match(line)
        if m:
            sections.append(Section(level=len(m.group(1)), title=m.group(2).strip(), start=i))
        else:
            sections[-1].lines.append(line)
    return sections


def find_section(sections: list[Section], *names: str) -> Section | None:
    """First section whose title starts with one of `names` (case-insensitive)."""
    wanted = [n.lower() for n in names]
    for s in sections:
        title = clean_inline(s.title).lower()
        title = re.sub(r"\s*\*?\(.*?\)\*?\s*$", "", title).strip()
        if any(title.startswith(w) for w in wanted):
            return s
    return None


def subsections(sections: list[Section], parent: Section) -> list[Section]:
    """Sections nested under `parent`, up to the next same-or-higher heading."""
    out: list[Section] = []
    seen = False
    for s in sections:
        if s is parent:
            seen = True
            continue
        if not seen:
            continue
        if s.level <= parent.level:
            break
        out.append(s)
    return out


def extract_files(text: str) -> list[str]:
    """Backtick-quoted tokens that look like file paths."""
    out: list[str] = []
    for token in INLINE_CODE_RE.findall(text):
        token = token.strip()
        if " " in token or len(token) > 160:
            continue
        if "/" in token and re.search(r"\.\w{1,6}$", token):
            out.append(token)
    return list(dict.fromkeys(out))


# --------------------------------------------------------------------------
# tasks.md
# --------------------------------------------------------------------------

CHECKBOX_RE = re.compile(r"^\s*[-*]\s+\[([ xX~\-])\]\s+(.*)$")
TASK_ID_RE = re.compile(r"^(?:\*\*)?(T\d{2,4}[a-zA-Z]?)(?:\*\*)?[.:]?\s*")
TAG_RE = re.compile(r"^\[(?:Story:\s*)?(P|US\d+|[A-Z]{1,4}\d*)\]\s*", re.I)
PHASE_RE = re.compile(r"^phase\s*(\d+)\s*[:.\-–—]?\s*(.*)$", re.I)
STORY_IN_TITLE_RE = re.compile(r"user\s*story\s*(\d+)", re.I)
PRIORITY_RE = re.compile(r"\((?:priority:\s*)?(P\d)\b", re.I)

SKIP_TASK_SECTIONS = (
    "format",
    "path convention",
    "dependencies",
    "notes",
    "prerequisites",
    "implementation strategy",
    "parallel example",
    "task generation",
    "summary",
    "input",
)


def _phase_kind(title: str) -> str:
    low = title.lower()
    if STORY_IN_TITLE_RE.search(low):
        return "story"
    if "setup" in low:
        return "setup"
    if "foundational" in low or "foundation" in low:
        return "foundational"
    if "polish" in low or "cross-cutting" in low:
        return "polish"
    return "other"


def parse_tasks(text: str) -> tuple[list[Phase], list[Task]]:
    sections = split_sections(text)
    phases: list[Phase] = []
    tasks: list[Task] = []
    fallback: list[Task] = []  # checkboxes without a T-id, used only if no ids exist

    for section in sections:
        title = clean_inline(section.title)
        if not title:
            continue
        low = title.lower()
        if any(low.startswith(skip) for skip in SKIP_TASK_SECTIONS):
            continue

        pm = PHASE_RE.match(low)
        display = clean_inline(re.sub(r"^phase\s*\d+\s*[:.\-–—]?\s*", "", title, flags=re.I))
        index = int(pm.group(1)) if pm else len(phases) + 1
        story_m = STORY_IN_TITLE_RE.search(title)
        prio_m = PRIORITY_RE.search(title)
        phase = Phase(
            index=index,
            title=display or title,
            kind=_phase_kind(title),  # type: ignore[arg-type]
            story=f"US{story_m.group(1)}" if story_m else None,
            priority=prio_m.group(1).upper() if prio_m else None,
            goal=section.field("Goal"),
            purpose=section.field("Purpose"),
        )

        for offset, raw in enumerate(section.lines):
            m = CHECKBOX_RE.match(raw)
            if not m:
                continue
            done = m.group(1).lower() in ("x", "~")
            body = m.group(2).strip()
            idm = TASK_ID_RE.match(body)
            task_id = idm.group(1) if idm else None
            if idm:
                body = body[idm.end() :]

            parallel = False
            story = phase.story
            while True:
                tm = TAG_RE.match(body)
                if not tm:
                    break
                tag = tm.group(1).upper()
                if tag == "P":
                    parallel = True
                elif tag.startswith("US"):
                    story = tag
                body = body[tm.end() :]

            task = Task(
                id=task_id or f"#{len(fallback) + 1}",
                description=clean_inline(body),
                done=done,
                parallel=parallel,
                story=story,
                phase=phase.title,
                phase_index=phase.index,
                line=section.start + offset + 1,
                files=extract_files(m.group(2)),
            )
            if task_id:
                tasks.append(task)
                phase.total += 1
                phase.done += int(done)
            else:
                fallback.append(task)

        if phase.total:
            phases.append(phase)

    if not tasks and fallback:
        tasks = fallback
        counts: dict[str, Phase] = {}
        for t in fallback:
            p = counts.get(t.phase)
            if p is None:
                p = Phase(index=t.phase_index, title=t.phase)
                counts[t.phase] = p
            p.total += 1
            p.done += int(t.done)
        phases = sorted(counts.values(), key=lambda p: p.index)

    phases.sort(key=lambda p: p.index)
    return phases, tasks


# --------------------------------------------------------------------------
# spec.md
# --------------------------------------------------------------------------

USER_STORY_RE = re.compile(
    r"^user\s*story\s*(\d+)\s*[-–—:]?\s*(.*?)\s*(?:\((?:priority:\s*)?(P\d)[^)]*\))?\s*$",
    re.I,
)
# Matched against an already-folded, emphasis-stripped bullet, so the id keeps
# its optional letter suffix (SC-005a) and the text keeps its wrapped remainder.
REQUIREMENT_RE = re.compile(r"^((?:FR|NFR|SC|SR|PR|CR)-?\d{1,3}[a-z]?)\s*[:.]?\s+(.*)$", re.I)
REQUIREMENT_ID_RE = re.compile(r"^([A-Za-z]{2,3})(-?)(\d{1,3})([a-zA-Z]?)$")
ORDERED_RE = re.compile(r"^\s*(\d+)\.\s+(.*)$")


def requirement_id(raw: str) -> str:
    """Normalise the case of a requirement id without rewriting it.

    Upper-casing the whole token turns `SC-005a` into `SC-005A`, which is not what
    the document says — and the id is the thing a reader matches against the spec
    in front of them. The prefix is normalised, the suffix letter is not.
    """
    m = REQUIREMENT_ID_RE.match(raw)
    if not m:
        return raw.upper()
    return f"{m.group(1).upper()}{m.group(2)}{m.group(3)}{m.group(4).lower()}"


@dataclass
class SpecInfo:
    title: str | None = None
    branch: str | None = None
    created: str | None = None
    status: str | None = None
    input: str | None = None
    summary: str | None = None
    user_stories: list[UserStory] = field(default_factory=list)
    requirements: list[Requirement] = field(default_factory=list)
    success_criteria: list[Requirement] = field(default_factory=list)
    edge_cases: list[str] = field(default_factory=list)
    clarifications: list[str] = field(default_factory=list)
    open_questions: list[str] = field(default_factory=list)


def _ordered_items(section: Section) -> list[str]:
    """Numbered list items, wrapped continuation lines folded in."""
    out: list[str] = []
    cur: list[str] | None = None
    for raw in section.lines:
        line = raw.rstrip()
        m = ORDERED_RE.match(line)
        if m and not line.startswith("  "):
            if cur:
                out.append(" ".join(cur))
            cur = [m.group(2)]
        elif cur is not None and line.strip() and line.startswith((" ", "\t")):
            cur.append(line.strip())
        elif not line.strip():
            if cur:
                out.append(" ".join(cur))
                cur = None
    if cur:
        out.append(" ".join(cur))
    return [clean_inline(x) for x in out if clean_inline(x)]


def _acceptance_from(section: Section) -> list[AcceptanceScenario]:
    """Numbered scenarios living under an `**Acceptance Scenarios**:` line."""
    body: list[str] = []
    collecting = False
    for raw in section.lines:
        s = raw.strip()
        m = BOLD_FIELD_RE.match(s)
        if m:
            collecting = m.group(1).lower().startswith("acceptance")
            continue
        if s.startswith("#"):
            collecting = False
        if collecting:
            body.append(raw)
    return [
        AcceptanceScenario(index=i + 1, text=t)
        for i, t in enumerate(_ordered_items(Section(level=0, title="", lines=body)))
    ]


def parse_spec(text: str) -> SpecInfo:
    sections = split_sections(text)
    info = SpecInfo()

    for s in sections:
        if s.level == 1:
            title = clean_inline(s.title)
            info.title = re.sub(r"^feature\s+specification\s*:\s*", "", title, flags=re.I) or None
            break

    head = sections[0] if sections else Section(level=0, title="")
    for s in sections[:3]:
        info.branch = info.branch or s.field("Feature Branch")
        info.created = info.created or s.field("Created")
        info.status = info.status or s.field("Status")
        info.input = info.input or s.field("Input")
    _ = head

    overview = find_section(sections, "overview", "summary")
    if overview:
        paras = overview.paragraphs()
        if paras:
            info.summary = paras[0]

    for s in sections:
        m = USER_STORY_RE.match(clean_inline(s.title))
        if not m or s.level < 3:
            continue
        number = int(m.group(1))
        story = UserStory(
            id=f"US{number}",
            number=number,
            title=clean_inline(m.group(2)) or f"User Story {number}",
            priority=(m.group(3) or "").upper() or None,
            why=s.field("Why this priority"),
            independent_test=s.field("Independent Test") or s.field("Independent test"),
            acceptance=_acceptance_from(s),
        )
        paras = s.paragraphs()
        if paras:
            story.narrative = paras[0]
        info.user_stories.append(story)
    info.user_stories.sort(key=lambda s: s.number)

    for s in sections:
        title = clean_inline(s.title).lower()
        target = None
        if title.startswith(("requirements", "functional requirements")):
            target = info.requirements
        elif title.startswith("success criteria"):
            target = info.success_criteria
        if target is None:
            continue
        # A `## Requirements` section and its own `### Functional Requirements`
        # subsection both match this loop, so the same bullet is reached twice —
        # keep the first occurrence of each id.
        seen = {r.id for r in target}
        for sub in [s, *subsections(sections, s)]:
            for bullet in sub.bullets():
                rm = REQUIREMENT_RE.match(bullet)
                if not rm:
                    continue
                req_id = requirement_id(rm.group(1))
                if req_id in seen:
                    continue
                seen.add(req_id)
                target.append(Requirement(id=req_id, text=rm.group(2).strip()))

    edge = find_section(sections, "edge case")
    if edge:
        info.edge_cases = edge.bullets() or _ordered_items(edge)

    clar = find_section(sections, "clarification")
    if clar:
        items = clar.bullets()
        for sub in subsections(sections, clar):
            items.extend(sub.bullets())
        info.clarifications = [i for i in items if i]

    info.open_questions = [
        clean_inline(q) or "unspecified" for q in NEEDS_CLARIFICATION_RE.findall(text)
    ]
    return info


# --------------------------------------------------------------------------
# plan.md
# --------------------------------------------------------------------------

TECH_KEYS = (
    "language",
    "language/version",
    "primary dependencies",
    "storage",
    "testing",
    "target platform",
    "project type",
    "performance goals",
    "constraints",
    "scale/scope",
)


def parse_plan(text: str) -> tuple[str | None, dict[str, str]]:
    sections = split_sections(text)
    summary = None
    for name in ("summary", "overview"):
        s = find_section(sections, name)
        if s:
            paras = s.paragraphs()
            if paras:
                summary = paras[0]
                break

    tech: dict[str, str] = {}
    ctx = find_section(sections, "technical context")
    if ctx:
        for raw in ctx.lines:
            m = BOLD_FIELD_RE.match(raw.strip())
            if not m:
                continue
            key = m.group(1).strip()
            if key.lower() not in TECH_KEYS or key in tech:
                continue
            # field() folds in the wrapped continuation lines; m.group(2) is only
            # the first physical line and these values wrap constantly.
            value = ctx.field(key)
            if value and "NEEDS CLARIFICATION" not in value.upper():
                tech[key] = value
    return summary, tech


# --------------------------------------------------------------------------
# checklists/*.md
# --------------------------------------------------------------------------


def parse_checklist(name: str, rel_path: str, text: str) -> Checklist:
    sections = split_sections(text)
    title = None
    for s in sections:
        if s.level == 1:
            title = clean_inline(s.title)
            break

    items: list[ChecklistItem] = []
    for s in sections:
        section_title = clean_inline(s.title) or None
        if s.level <= 1:
            section_title = None
        for raw in s.lines:
            m = CHECKBOX_RE.match(raw)
            if not m:
                continue
            body = m.group(2)
            body = re.sub(r"^(?:\*\*)?(CHK\d+|C\d+)(?:\*\*)?[.:]?\s*", "", body.strip())
            items.append(
                ChecklistItem(
                    text=clean_inline(body),
                    done=m.group(1).lower() in ("x", "~"),
                    section=section_title,
                )
            )

    done = sum(1 for i in items if i.done)
    return Checklist(
        name=name,
        file=rel_path,
        title=title,
        items=items,
        done=done,
        total=len(items),
    )
