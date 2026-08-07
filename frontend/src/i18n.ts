import { createContext, useContext } from 'react'

export type Lang = 'en' | 'ru'

export const LANGS: Lang[] = ['en', 'ru']

/**
 * The line this dictionary must not cross: anything read from a user's files
 * stays exactly as they wrote it. Feature titles, summaries, task text and the
 * scanner's evidence strings (`all 38 tasks ticked`) are their content and its
 * output — translating them would mean translating someone's own documents.
 *
 * English is the fallback and the source of truth, so a key missing from another
 * language renders readable English rather than a dotted id. A gap then looks
 * like an untranslated label instead of a broken page.
 *
 * No library: this is a dictionary lookup and two plural rules, and the page is
 * required to load nothing from the internet.
 */
const EN = {
  'app.tagline': 'spec-kit · read-only',
  'app.search': 'Search features, stories and tasks   /',
  'app.rescan': 'Rescan (r)',
  'app.theme': 'Theme',
  'app.language': 'Language',
  'app.live': 'live',
  'app.connecting': 'connecting…',
  'app.offline': 'offline',
  'app.lastScan': 'last scan',
  'app.scanning': 'Scanning projects…',
  'app.noProjects': 'No spec-kit projects found',
  'app.noProjectsHint':
    'Mount the folder holding your projects at /projects (PROJECTS_ROOT in .env). A project is any directory with .specify/ or specs/ in it.',
  'app.brokenTitle': '{count} project(s) were read incompletely',
  'app.nothingSelected': 'No project is selected.',
  'app.ms': '{ms} ms',

  'view.features': 'Features',
  'view.stories': 'Stories',
  'view.trend': 'Trend',

  'board.empty': 'empty',
  'board.columnTotals': '{done}/{total} tasks in this column',
  'board.tasks': 'tasks',
  'board.tasksOfShownFeatures': 'tasks of the features shown',
  'board.tasksOfShownStories': 'tasks of the stories shown',

  'stage.specify.hint': 'Spec written, awaiting clarification',
  'stage.clarify.hint': 'Clarified, not yet planned',
  'stage.plan.hint': 'Planned, tasks not cut yet',
  'stage.tasks.hint': 'Tasks cut, work not started',
  'stage.implement.hint': 'Tasks are being closed',
  'stage.done.hint': 'Every task is closed',

  'card.open': 'Open {title}',
  'card.tasks': 'tasks',
  'card.parallel': 'Can be done in parallel',
  'card.openQuestions': '{count} open question(s) in the spec',
  'card.checklists': 'checklists',
  'card.acceptance': '{count} acceptance scenario(s)',
  'card.noStory': 'Tasks with no story',
  'card.current': 'The active feature (.specify/feature.json)',
  'card.missing': 'no {label}',

  'drawer.overview': 'Overview',
  'drawer.tasks': 'Tasks',
  'drawer.checklists': 'Checklists',
  'drawer.docs': 'Documents',
  'drawer.history': 'History',
  'drawer.modified': 'changed {when}',
  'drawer.created': 'created {date}',
  'drawer.summary': 'In short',
  'drawer.status': 'Status',
  'drawer.taskCount': 'Tasks',
  'drawer.checklistCount': 'Checklists',
  'drawer.requirementCount': 'Requirements',
  'drawer.requirementsShort': '{count} FR',
  'drawer.stories': 'User stories',
  'drawer.storyTasks': '{done}/{total} tasks',
  'drawer.storyTasksTooltip': 'tasks in tasks.md tagged {story}: {done} of {total} closed',
  'drawer.why': 'Why this priority',
  'drawer.independentTest': 'Independent test',
  'drawer.acceptance': 'Acceptance scenarios',
  'drawer.tech': 'Technical context (plan.md)',
  'drawer.successCriteria': 'Success criteria',
  'drawer.requirements': 'Requirements',
  'drawer.edgeCases': 'Edge cases',
  'drawer.clarifications': 'Clarifications',
  'drawer.input': 'Original request',
  'drawer.showMore': 'show {count} more',
  'drawer.byPhase': 'By phase',
  'drawer.byStory': 'By story',
  'drawer.onlyOpen': 'Unfinished only',
  'drawer.noTasksTitle': 'No tasks yet',
  'drawer.noTasksBody': 'This feature has no tasks.md — spec-kit has not cut the work yet.',
  'drawer.noChecklistsTitle': 'No checklists',
  'drawer.noChecklistsBody': 'The feature folder has no checklists/ directory.',
  'drawer.pickDocument': 'Choose a document on the left.',
  'drawer.noCommitsTitle': 'No commits found',
  'drawer.noCommitsBody':
    'Either the project is not under git, or nothing in its history has touched specs/{feature}.',
  'drawer.done': 'done',
  'drawer.notDone': 'not done',
  'drawer.loadFailed': 'Could not load {file}',

  'trend.reading': 'reading git history…',
  'trend.unavailable': 'History unavailable',
  'trend.noData': 'no data',
  'trend.closed': 'closed',
  'trend.totalTasks': 'total tasks',
  'trend.pointIsCommit': 'a point is a commit that touched specs/',
  'trend.asOfLastCommit': 'as of the last commit, not the working tree',
  'trend.delta': '+{delta} over {commits} commits',
  'trend.stale': 'Longest without a commit',
  'trend.chartLabel': 'Closed tasks per commit: {done} of {total}',
  'trend.pointTooltip': '{done}/{total} tasks ({pct}%), {files} tasks.md',

  'time.justNow': 'just now',
  'time.minutes': '{n} min ago',
  'time.hours': '{n} h ago',
  'time.days': '{n} d ago',
  'time.months': '{n} mo ago',
  'time.years': '{n} y ago',
  'time.never': '—',
}

type Key = keyof typeof EN

const RU: Partial<Record<Key, string>> = {
  'app.tagline': 'spec-kit · только чтение',
  'app.search': 'Поиск по фичам, историям и задачам   /',
  'app.rescan': 'Пересканировать (r)',
  'app.theme': 'Тема',
  'app.language': 'Язык',
  'app.live': 'на связи',
  'app.connecting': 'подключаюсь…',
  'app.offline': 'нет связи',
  'app.lastScan': 'последний скан',
  'app.scanning': 'Сканирую проекты…',
  'app.noProjects': 'Проекты spec-kit не найдены',
  'app.noProjectsHint':
    'Смонтируйте папку с проектами в /projects (PROJECTS_ROOT в .env). Проектом считается каталог, где есть .specify/ или specs/.',
  'app.brokenTitle': 'Проектов прочитано не полностью: {count}',
  'app.nothingSelected': 'Ни одного проекта не выбрано.',
  'app.ms': '{ms} мс',

  'view.features': 'Фичи',
  'view.stories': 'Истории',
  'view.trend': 'Динамика',

  'board.empty': 'пусто',
  'board.columnTotals': '{done}/{total} задач в колонке',
  'board.tasks': 'задач',
  'board.tasksOfShownFeatures': 'задачи показанных фич',
  'board.tasksOfShownStories': 'задачи показанных историй',

  'stage.specify.hint': 'Спека написана, ждёт уточнений',
  'stage.clarify.hint': 'Уточнена, план ещё не построен',
  'stage.plan.hint': 'План есть, задачи не нарезаны',
  'stage.tasks.hint': 'Задачи нарезаны, работа не началась',
  'stage.implement.hint': 'Задачи закрываются',
  'stage.done.hint': 'Все задачи закрыты',

  'card.open': 'Открыть {title}',
  'card.tasks': 'задачи',
  'card.parallel': 'Можно делать параллельно',
  'card.openQuestions': 'Открытых вопросов в спеке: {count}',
  'card.checklists': 'чеклисты',
  'card.acceptance': 'Сценариев приёмки: {count}',
  'card.noStory': 'Задачи без истории',
  'card.current': 'Активная фича (.specify/feature.json)',
  'card.missing': 'нет {label}',

  'drawer.overview': 'Обзор',
  'drawer.tasks': 'Задачи',
  'drawer.checklists': 'Чеклисты',
  'drawer.docs': 'Документы',
  'drawer.history': 'История',
  'drawer.modified': 'изменено {when}',
  'drawer.created': 'создано {date}',
  'drawer.summary': 'Суть',
  'drawer.status': 'Статус',
  'drawer.taskCount': 'Задачи',
  'drawer.checklistCount': 'Чеклисты',
  'drawer.requirementCount': 'Требования',
  'drawer.requirementsShort': '{count} FR',
  'drawer.stories': 'Пользовательские истории',
  'drawer.storyTasks': '{done}/{total} задач',
  'drawer.storyTasksTooltip': 'задачи tasks.md с тегом {story}: {done} из {total} закрыто',
  'drawer.why': 'Почему такой приоритет',
  'drawer.independentTest': 'Независимая проверка',
  'drawer.acceptance': 'Сценарии приёмки',
  'drawer.tech': 'Технический контекст (plan.md)',
  'drawer.successCriteria': 'Критерии успеха',
  'drawer.requirements': 'Требования',
  'drawer.edgeCases': 'Краевые случаи',
  'drawer.clarifications': 'Уточнения',
  'drawer.input': 'Исходный запрос',
  'drawer.showMore': 'показать ещё {count}',
  'drawer.byPhase': 'По фазам',
  'drawer.byStory': 'По историям',
  'drawer.onlyOpen': 'Только незакрытые',
  'drawer.noTasksTitle': 'Задач ещё нет',
  'drawer.noTasksBody': 'В этой фиче нет tasks.md — spec-kit ещё не нарезал работу.',
  'drawer.noChecklistsTitle': 'Чеклистов нет',
  'drawer.noChecklistsBody': 'В папке фичи нет каталога checklists/.',
  'drawer.pickDocument': 'Выберите документ слева.',
  'drawer.noCommitsTitle': 'Коммитов не найдено',
  'drawer.noCommitsBody':
    'Либо проект не под git, либо в истории нет коммитов, трогавших specs/{feature}.',
  'drawer.done': 'сделано',
  'drawer.notDone': 'не сделано',
  'drawer.loadFailed': 'Не удалось загрузить {file}',

  'trend.reading': 'читаю историю git…',
  'trend.unavailable': 'История недоступна',
  'trend.noData': 'нет данных',
  'trend.closed': 'закрыто',
  'trend.totalTasks': 'всего задач',
  'trend.pointIsCommit': 'точка — коммит, тронувший specs/',
  'trend.asOfLastCommit': 'по последнему коммиту, а не по рабочей копии',
  'trend.delta': '+{delta} за {commits} коммитов',
  'trend.stale': 'Дольше всего без коммитов',
  'trend.chartLabel': 'Закрытые задачи по коммитам: {done} из {total}',
  'trend.pointTooltip': '{done}/{total} задач ({pct}%), {files} tasks.md',

  'time.justNow': 'только что',
  'time.minutes': '{n} мин назад',
  'time.hours': '{n} ч назад',
  'time.days': '{n} дн назад',
  'time.months': '{n} мес назад',
  'time.years': '{n} г назад',
  'time.never': '—',
}

const DICT: Record<Lang, Partial<Record<Key, string>>> = { en: EN, ru: RU }

/** Counted nouns, because `1 историй` is what naive interpolation produces. */
const PLURALS: Record<Lang, Record<string, string[]>> = {
  // [one, other]
  en: {
    feature: ['feature', 'features'],
    story: ['story', 'stories'],
    task: ['task', 'tasks'],
    project: ['project', 'projects'],
    scenario: ['scenario', 'scenarios'],
    question: ['question', 'questions'],
    commit: ['commit', 'commits'],
    contract: ['contract', 'contracts'],
  },
  // [one, few, many]
  ru: {
    feature: ['фича', 'фичи', 'фич'],
    story: ['история', 'истории', 'историй'],
    task: ['задача', 'задачи', 'задач'],
    project: ['проект', 'проекта', 'проектов'],
    scenario: ['сценарий', 'сценария', 'сценариев'],
    question: ['вопрос', 'вопроса', 'вопросов'],
    commit: ['коммит', 'коммита', 'коммитов'],
    contract: ['контракт', 'контракта', 'контрактов'],
  },
}

function form(lang: Lang, n: number): number {
  if (lang === 'en') return n === 1 ? 0 : 1
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1
  return 2
}

export function plural(lang: Lang, n: number, noun: keyof (typeof PLURALS)['en']): string {
  const forms = PLURALS[lang][noun] ?? PLURALS.en[noun]
  return `${n} ${forms[form(lang, n)] ?? forms[forms.length - 1]}`
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const template = DICT[lang]?.[key] ?? EN[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}

/** Interface copy that happens to live in a utility. */
export function relativeTime(lang: Lang, epochSeconds: number): string {
  if (!epochSeconds) return translate(lang, 'time.never')
  const seconds = Math.max(0, Date.now() / 1000 - epochSeconds)
  if (seconds < 45) return translate(lang, 'time.justNow')
  const minutes = seconds / 60
  if (minutes < 60) return translate(lang, 'time.minutes', { n: Math.round(minutes) })
  const hours = minutes / 60
  if (hours < 24) return translate(lang, 'time.hours', { n: Math.round(hours) })
  const days = hours / 24
  if (days < 30) return translate(lang, 'time.days', { n: Math.round(days) })
  const months = days / 30
  if (months < 12) return translate(lang, 'time.months', { n: Math.round(months) })
  return translate(lang, 'time.years', { n: Math.round(months / 12) })
}

export const STORAGE_KEY = 'specdash-lang'

/** The browser's choice, then English — never a key. */
export function detectLang(): Lang {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (stored) {
    const parsed = stored.replace(/"/g, '') as Lang
    if (LANGS.includes(parsed)) return parsed
  }
  const wanted = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  for (const tag of wanted) {
    const base = (tag ?? '').slice(0, 2).toLowerCase() as Lang
    if (LANGS.includes(base)) return base
  }
  return 'en'
}

export interface Translator {
  lang: Lang
  t: (key: Key, vars?: Record<string, string | number>) => string
  n: (count: number, noun: keyof (typeof PLURALS)['en']) => string
  ago: (epochSeconds: number) => string
  setLang: (lang: Lang) => void
}

export const LangContext = createContext<Translator>({
  lang: 'en',
  t: (key, vars) => translate('en', key, vars),
  n: (count, noun) => plural('en', count, noun),
  ago: (seconds) => relativeTime('en', seconds),
  setLang: () => undefined,
})

export function useT(): Translator {
  return useContext(LangContext)
}
