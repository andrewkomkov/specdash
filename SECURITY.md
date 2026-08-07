# Security

## Reporting

Report a vulnerability through [GitHub's private advisory
form](https://github.com/andrewkomkov/specdash/security/advisories/new). Please do not open
a public issue for anything exploitable.

Expect an acknowledgement within a week. This is a small project maintained in spare time;
there is no bounty and no on-call rota, and being told that plainly is more useful than a
promise nobody can keep.

## What SpecDash is, in security terms

It is a **local, unauthenticated, read-only viewer**. Understanding those three words is most
of the threat model.

- **Unauthenticated.** There is no login, no token and no per-project permission. Anyone who
  can reach the port can read every specification, plan and task list under the mounted root.
  The container listens on all interfaces, so on a shared network that is everyone on it.
  Bind it to localhost — `SPECDASH_BIND=127.0.0.1` in `.env` — unless you intend otherwise.
- **Read-only.** The application never opens a scanned path for writing, git is restricted to
  a read-only subcommand allow-list, and the compose file mounts every project `:ro` so the
  kernel refuses a write even if a future line of code asks for one. CI asserts this on every
  build by trying to write into a mounted checkout and failing the build if it succeeds.
- **Local.** The page requests nothing from the internet: no CDN, no font host, no telemetry,
  no update check. Every asset is inside the image.

## In scope

- A path that escapes the project directory through `GET .../doc?file=`
- Anything that causes a write into a scanned repository
- A request that leaves the machine
- Remote code execution through a crafted markdown document
- A crash that a single malformed file can cause across the whole board

## Out of scope

- The absence of authentication, which is a documented design decision rather than a defect
- Exposure that follows from publishing the port yourself
- Denial of service by pointing it at a pathologically large tree
