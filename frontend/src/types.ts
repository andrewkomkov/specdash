export type Stage = 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement' | 'done'

export const STAGES: Stage[] = ['specify', 'clarify', 'plan', 'tasks', 'implement', 'done']

export const STAGE_LABEL: Record<Stage, string> = {
  specify: 'Specify',
  clarify: 'Clarify',
  plan: 'Plan',
  tasks: 'Tasks',
  implement: 'Implement',
  done: 'Done',
}

export const STAGE_COLOR: Record<Stage, string> = {
  specify: 'grape',
  clarify: 'violet',
  plan: 'indigo',
  tasks: 'cyan',
  implement: 'teal',
  done: 'green',
}

export const PRIORITY_COLOR: Record<string, string> = {
  P1: 'red',
  P2: 'orange',
  P3: 'yellow',
  P4: 'gray',
}

export interface Progress {
  done: number
  total: number
  pct: number
}

export interface Task {
  id: string
  description: string
  done: boolean
  parallel: boolean
  story: string | null
  phase: string
  phase_index: number
  line: number
  files: string[]
}

export interface Phase {
  index: number
  title: string
  kind: 'setup' | 'foundational' | 'story' | 'polish' | 'other'
  story: string | null
  priority: string | null
  goal: string | null
  purpose: string | null
  done: number
  total: number
}

export interface UserStory {
  id: string
  number: number
  title: string
  priority: string | null
  why: string | null
  independent_test: string | null
  narrative: string | null
  acceptance: { index: number; text: string }[]
  done: number
  total: number
  stage: Stage
  stage_reason: string
  /** false for a story only tasks.md knows about */
  in_spec: boolean
}

export interface Requirement {
  id: string
  text: string
}

export interface Checklist {
  name: string
  file: string
  title: string | null
  items: { text: string; done: boolean; section: string | null }[]
  done: number
  total: number
}

export type Severity = 'blocker' | 'warn' | 'info'

export const SEVERITY_COLOR: Record<Severity, string> = {
  blocker: 'red',
  warn: 'orange',
  info: 'gray',
}

/** One observed disagreement between two of a feature's artefacts. */
export interface Finding {
  code: string
  severity: Severity
  message: string
  ref: string | null
  file: string | null
}

export interface ComplexityRow {
  violation: string
  why_needed: string | null
  alternative: string | null
}

export interface ConstitutionResult {
  verdict: 'pass' | 'fail' | 'unknown'
  evidence: string | null
  rows: ComplexityRow[]
}

export interface Entity {
  name: string
  text: string
}

export interface ManifestFile {
  path: string
  state: 'ok' | 'modified' | 'missing' | 'unverified'
  reason: string | null
}

export interface Toolchain {
  speckit_version: string | null
  integration: string | null
  integrations: string[]
  script: string | null
  feature_numbering: string | null
  files: ManifestFile[]
  drift: number
}

export interface WorkflowStep {
  id: string
  kind: 'command' | 'gate'
  command: string | null
  message: string | null
  on_reject: string | null
}

export interface DeclaredWorkflow {
  id: string
  name: string | null
  version: string | null
  description: string | null
  source: string | null
  steps: WorkflowStep[]
  error: string | null
}

export interface Artifact {
  key: string
  file: string
  label: string
  bytes: number
  modified: number
  headings: number
  words: number
}

export interface Commit {
  sha: string
  subject: string
  author: string
  date: string
  relative: string
}

export interface Feature {
  id: string
  project_id: string
  number: string | null
  slug: string
  title: string
  stage: Stage
  stage_reason: string
  status: string | null
  branch: string | null
  created: string | null
  is_current: boolean
  summary: string | null
  input: string | null
  progress: Progress
  checklist_progress: Progress
  artifacts: Artifact[]
  user_stories: UserStory[]
  /** setup / foundational / polish tasks, which belong to no story */
  unassigned: UserStory | null
  phases: Phase[]
  tasks: Task[]
  checklists: Checklist[]
  requirements: Requirement[]
  success_criteria: Requirement[]
  edge_cases: string[]
  clarifications: string[]
  tech: Record<string, string>
  open_questions: string[]
  entities: Entity[]
  assumptions: string[]
  dependencies: string[]
  duplicate_requirements: string[]
  /** null when plan.md has no constitution section at all */
  constitution: ConstitutionResult | null
  findings: Finding[]
  modified: number
  commits: Commit[]
}

export interface Project {
  id: string
  name: string
  path: string
  has_specify: boolean
  constitution: string | null
  constitution_version: string | null
  current_feature: string | null
  branch: string | null
  features: Feature[]
  /** null when spec-kit left none of its own bookkeeping in the project */
  toolchain: Toolchain | null
  workflows: DeclaredWorkflow[]
  modified: number
  error: string | null
}

export interface HistoryPoint {
  sha: string
  date: string
  subject: string
  done: number
  total: number
  features: number
  pct: number
}

export interface StaleFeature {
  feature_id: string
  title: string | null
  date: string
  days: number
  subject: string | null
}

export interface ProjectHistory {
  project_id: string
  available: boolean
  reason: string | null
  points: HistoryPoint[]
  stale: StaleFeature[]
  commits_scanned: number
}

export interface SearchHit {
  kind: 'feature' | 'story' | 'task' | 'requirement' | 'checklist' | 'document'
  project_id: string
  feature_id: string
  ref: string
  file: string | null
  title: string
  subtitle: string
  /** matched text, marked with \x02 and \x03 rather than with HTML */
  snippet: string
  score: number
}

export interface SearchResult {
  query: string
  hits: SearchHit[]
  total: number
  took_ms: number
  matched_by: 'tokens' | 'substring' | 'none'
  suggestions: string[]
}

export interface Snapshot {
  generated_at: number
  root: string
  projects: Project[]
  scan_ms: number
}
