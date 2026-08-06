const PROJECT_COLORS = [
  'blue',
  'grape',
  'teal',
  'orange',
  'pink',
  'lime',
  'cyan',
  'violet',
  'yellow',
  'indigo',
]

/** Stable per-project accent colour, so a project keeps its hue across reloads. */
export function projectColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}

export function relativeTime(epochSeconds: number): string {
  if (!epochSeconds) return '—'
  const seconds = Math.max(0, Date.now() / 1000 - epochSeconds)
  if (seconds < 45) return 'только что'
  const minutes = seconds / 60
  if (minutes < 60) return `${Math.round(minutes)} мин назад`
  const hours = minutes / 60
  if (hours < 24) return `${Math.round(hours)} ч назад`
  const days = hours / 24
  if (days < 30) return `${Math.round(days)} дн назад`
  const months = days / 30
  if (months < 12) return `${Math.round(months)} мес назад`
  return `${Math.round(months / 12)} г назад`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function progressColor(pct: number): string {
  if (pct >= 100) return 'green'
  if (pct >= 60) return 'teal'
  if (pct >= 25) return 'yellow'
  if (pct > 0) return 'orange'
  return 'gray'
}
