export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** The progress hue. One step, whatever the value.
 *
 * This used to be a traffic light — grey under 1%, orange under 25%, yellow
 * under 60% — which painted a feature that had merely started in the colours a
 * finding is entitled to. Magnitude is carried by the length of the bar; the
 * hue says only "this is progress".
 */
export const PROGRESS_COLOR = 'var(--progress)'

/** Ordered stage steps, read from the stylesheet so light and dark stay
 *  selected sets rather than inversions of one another. */
export const STAGE_COLOR_VAR: Record<string, string> = {
  specify: 'var(--stage-specify)',
  clarify: 'var(--stage-clarify)',
  plan: 'var(--stage-plan)',
  tasks: 'var(--stage-tasks)',
  implement: 'var(--stage-implement)',
  done: 'var(--stage-done)',
}

/** Reserved for findings, and never carried alone.
 *
 * Brand green against a status red measures ΔE 7.1 for deuteranopia — below the
 * 8.0 target, and not fixable by re-stepping, because red/amber/green fails
 * those floors in every ordering. "Done" and "blocked" are the two states on
 * this board that must never be confused, so every finding also carries an icon
 * and a word.
 */
export const SEVERITY_COLOR_VAR: Record<string, string> = {
  blocker: 'var(--status-blocker)',
  warn: 'var(--status-warn)',
  info: 'var(--status-info)',
}
