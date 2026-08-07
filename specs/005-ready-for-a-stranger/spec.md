# Feature Specification: Ready for a stranger

**Feature Branch**: `005-ready-for-a-stranger`

**Created**: 2026-08-07

**Status**: Implemented

**Input**: User description: "давай все три - клавиатуру, README и локализацию" / "репу сделай прям идеально рекламной с скриншотами (можно фоткать мою доску — все проекты открытые там)" / "ну и по бестпрактисам там что надо — заведи чтоб репа была конфетка"

## Overview

SpecDash works. It is released, published as a multi-arch image, covered by 157 unit tests
and 33 end-to-end cases. What it is not is *ready for someone who is not its author*, and
every gap here is a specific instance of that:

- the interface is Russian-only — 232 hardcoded Cyrillic strings, no localisation of any
  kind — while the README is in English and invites a stranger to run the image in one
  command. They get a board they cannot read;
- a feature card is opened by clicking it and by nothing else. `StoryCard` carries a role,
  a tab stop and a key handler; `FeatureCard` carries none. The board cannot be worked
  without a mouse;
- the README describes the tool in prose and shows nothing. A board is a visual artefact
  and the repository has never shown one;
- the service has no authentication of any kind and the container listens on every
  interface. On a shared network, anyone can read the specs. That is a defensible choice
  for a local tool and an indefensible thing to leave unsaid;
- the repository has none of the furniture a stranger looks for — how to contribute, where
  to report a vulnerability, what an issue should contain, whether dependencies are kept
  current, whether the code is linted.

None of this changes what SpecDash does. All of it changes whether anyone else can use it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the board in your own language (Priority: P1)

Someone runs the published image on the strength of an English README and gets a board
labelled `Пусто`, `Задач в колонке`, `Только незакрытые`. They cannot use it, and nothing
tells them why.

**Why this priority**: It is the difference between a public tool and a personal one.

**Independent Test**: Load the board with an English browser and read every label; switch to
Russian and read them again.

**Acceptance Scenarios**:

1. **Given** a browser asking for English, **When** the board loads, **Then** every label,
   tooltip, empty state and relative time is in English.
2. **Given** a browser asking for Russian, **When** the board loads, **Then** it is in
   Russian, as it is today.
3. **Given** either, **When** the language is switched from the header, **Then** the whole
   interface changes at once and the choice survives a reload.
4. **Given** a count of one, **When** it is labelled, **Then** the noun agrees with it —
   `1 feature`, `1 фича`, not today's `1 историй`.
5. **Given** content that comes from the user's files — feature titles, task text, evidence
   strings — **When** the language changes, **Then** that content is untouched. It is their
   writing, not ours to translate.

### User Story 2 - Work the board without a mouse (Priority: P1)

**Why this priority**: A card that only responds to a click excludes keyboard and screen
reader users from the primary action of the entire application.

**Independent Test**: Tab to a feature card and open it with Enter.

**Acceptance Scenarios**:

1. **Given** the board, **When** Tab is pressed, **Then** focus reaches each card in order
   and is visibly marked.
2. **Given** a focused card, **When** Enter or Space is pressed, **Then** the drawer opens
   on that feature.
3. **Given** a card, **When** a screen reader announces it, **Then** it is announced as a
   button with the feature's name.

### User Story 3 - See what it is before installing it (Priority: P2)

The README makes claims a screenshot would settle in a second.

**Why this priority**: It decides whether a stranger tries the tool at all, but it changes
nothing for someone already running it.

**Independent Test**: Open the README on GitHub and understand what the tool looks like
without scrolling to the configuration table.

**Acceptance Scenarios**:

1. **Given** the README, **When** it is opened, **Then** a screenshot of the real board is
   the first thing after the one-line description.
2. **Given** the README, **When** it is read, **Then** both grains, the detail drawer and
   the trend view are each shown.
3. **Given** the README, **When** the badges are read, **Then** they report the build, the
   release and the licence truthfully.
4. **Given** the screenshots, **When** they are taken, **Then** the board is in English, so
   that they match what the README's reader will see.

### User Story 4 - Know how to take part, and how to report a problem (Priority: P2)

**Why this priority**: Furniture. It costs an afternoon and its absence is the difference
between a repository someone contributes to and one they read once.

**Independent Test**: Open a new issue and see a template; look for a security contact and
find one.

**Acceptance Scenarios**:

1. **Given** the repository, **When** an issue is opened, **Then** a template asks for the
   version, the platform and what the files looked like.
2. **Given** a vulnerability, **When** the reporter looks for how to disclose it, **Then**
   `SECURITY.md` says where to send it and what is in scope.
3. **Given** a contributor, **When** they look for how to build and test, **Then**
   `CONTRIBUTING.md` says so, including the spec-kit workflow this project holds itself to.
4. **Given** a dependency release, **When** it lands, **Then** an update is proposed
   automatically.

### User Story 5 - Be told what it does not protect (Priority: P2)

**Why this priority**: A read-only guarantee stated loudly beside an unauthenticated port
stated nowhere is a misleading pair.

**Independent Test**: Read the README and learn, before running it, who can reach the board.

**Acceptance Scenarios**:

1. **Given** the README, **When** the read-only section is read, **Then** it also says the
   service is unauthenticated and reachable by anyone who can reach the port.
2. **Given** the compose file, **When** it is read, **Then** it shows how to bind to
   localhost only.

### User Story 6 - Find it without a terminal (Priority: P3)

A repository is a place for people who already decided. A page is where they decide. It is
built from the same screenshots, published on GitHub Pages by the same CI that publishes
the image, and it loads nothing from the internet — the same rule the application holds
itself to.

**Why this priority**: Last, because everything above serves people who already arrived.

**Independent Test**: Open the published URL and understand, without scrolling, what the
tool is and how to run it.

**Acceptance Scenarios**:

1. **Given** a push to main, **When** CI runs, **Then** the page is rebuilt and published.
2. **Given** the page, **When** it is opened on a phone, **Then** it is readable without
   horizontal scrolling.
3. **Given** the page, **When** its network activity is inspected, **Then** nothing is
   requested from a third party — no font host, no analytics, no CDN.
4. **Given** the page, **When** it is read in a dark-themed browser, **Then** it is legible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every string the interface authors MUST be translatable; content read from a
  user's files MUST NOT be.
- **FR-002**: The language MUST default to the browser's, fall back to English, and be
  overridable from the header and remembered.
- **FR-003**: Counted nouns MUST agree with their number in both languages.
- **FR-004**: Localisation MUST add no runtime dependency — the page loads nothing from the
  internet and that must remain true (Constitution).
- **FR-005**: Every card MUST be focusable, operable by Enter and Space, announced as a
  button, and visibly marked when focused.
- **FR-006**: The README MUST show the real board, in English, above the fold.
- **FR-007**: The README MUST state that the service is unauthenticated, and show how to
  bind it to localhost.
- **FR-008**: The repository MUST carry contribution, security, issue and pull request
  guidance, automated dependency updates, and an editor configuration.
- **FR-009**: Both halves MUST be linted in CI, so style is not a review topic.
- **FR-010**: The E2E suite MUST assert the localisation and the keyboard path, since both
  are behaviours a unit test cannot see.
- **FR-011**: The landing page MUST be self-contained — no third-party request of any kind,
  matching the guarantee the application already makes about itself.
- **FR-012**: The landing page MUST be published by CI rather than by hand, so it cannot
  drift from the repository it advertises.
- **FR-013**: The landing page MUST be readable on a phone and in both colour schemes.

## Success Criteria *(mandatory)*

- **SC-001**: No Cyrillic string literal remains in `frontend/src` outside the dictionary.
- **SC-002**: The board is fully operable with the keyboard alone, from load to open to
  close.
- **SC-003**: A reader who has never seen the tool understands what it looks like within
  one screen of the README.
- **SC-004**: CI lints both halves and fails on a violation.
- **SC-005**: Both suites still pass, and backend coverage stays at 100%.
- **SC-006**: The landing page is live, and requests nothing from a third party.

## Edge Cases

- A browser asking for a language we do not have: falls back to English rather than showing
  keys.
- A relative time of "just now" has no number, so it must not be pluralised.
- Screenshots age. They are of a real board, so they will drift from the code; the risk is
  accepted rather than solved, and they are stored in the repository rather than hotlinked.
- A translation missing a key must render the key's English text, never an empty label.
