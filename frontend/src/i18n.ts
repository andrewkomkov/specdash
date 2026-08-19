import { createContext, useContext } from 'react'

export type Lang = 'en' | 'ru'

export const LANGS: Lang[] = ['en', 'ru']

/**
 * The line this dictionary must not cross: anything read from a user's files
 * stays exactly as they wrote it. Feature titles, summaries, task text and the
 * scanner's evidence strings (`all 38 tasks ticked`) are their content and its
 * output — translating them would mean translating someone's own documents.
 *
 * Prose the application composes *about* a feature is a different thing, and it
 * is translated wherever it is written — including the sentences the backend
 * writes, which arrive as a key and its variables with the English text beside
 * them as a fallback.
 *
 * English is the fallback and the source of truth, so an unknown key renders
 * readable English rather than a dotted id. Russian is total over the key set,
 * which the type checker enforces: a key added here and forgotten there is a
 * build error rather than a silently English label.
 *
 * No library: this is a dictionary lookup, two plural rules and a placeholder
 * regex, and the page is required to load nothing from the internet.
 */
const EN = {
  'app.tagline': 'spec-kit · read-only',
  'app.search': 'Filter features, stories and tasks',
  'app.rescan': 'Rescan',
  'app.theme': 'Theme',
  'app.language': 'Language',
  'app.live': 'live',
  'app.connecting': 'connecting…',
  'app.offline': 'offline',
  'app.lastScan': 'Last scan',
  'app.scanning': 'Scanning projects…',
  'app.noProjects': 'No spec-kit projects found',
  'app.noProjectsHint':
    'Mount the folder holding your projects at /projects (PROJECTS_ROOT in .env). A project is any directory with .specify/ or specs/ in it.',
  'app.brokenTitle': '{count:project} could not be read in full',
  'app.nothingSelected': 'No project is selected.',
  'app.ms': '{ms} ms',

  'view.features': 'Features',
  'view.stories': 'Stories',
  'view.trend': 'Trend',

  'board.columnTotals': '{done}/{total} {total#task} in this column',
  'board.tasksTotal': '{done}/{total} {total#task}',
  'board.tasksOfShownFeatures': 'Tasks in the features currently shown',
  'board.tasksOfShownStories': 'Tasks in the stories currently shown',

  // The six column headers. They are SpecDash's vocabulary rather than
  // spec-kit's syntax — the tooltip beside each is what ties a column back to
  // the evidence a card cites.
  'stage.specify.label': 'Specify',
  'stage.clarify.label': 'Clarify',
  'stage.plan.label': 'Plan',
  'stage.tasks.label': 'Tasks',
  'stage.implement.label': 'Implement',
  'stage.done.label': 'Done',

  'stage.specify.hint': 'spec.md written, nothing else yet',
  'stage.clarify.hint': 'Clarified, no plan.md yet',
  'stage.plan.hint': 'plan.md present, tasks not cut yet',
  'stage.tasks.hint': 'Tasks cut, none ticked yet',
  'stage.implement.hint': 'Some tasks ticked, some not',
  'stage.done.hint': 'Every task ticked',

  // An empty column says what would put a card in it, in the same terms the
  // scanner uses when it explains where a card already sits. One construction
  // for all six, because they are read one after another.
  'stage.specify.empty': 'Nothing has spec.md and nothing else yet.',
  'stage.clarify.empty': 'Nothing is clarified and waiting for a plan.md.',
  'stage.plan.empty': 'Nothing has a plan.md without a tasks.md beside it.',
  'stage.tasks.empty': 'Nothing has tasks cut with none of them ticked.',
  'stage.implement.empty': 'Nothing has some of its tasks ticked and some not.',
  'stage.done.empty': 'Nothing has every task ticked yet.',

  'card.open': 'Open {title}',
  'card.tasks': 'Tasks',
  'card.parallel': 'Marked [P] in tasks.md — can run in parallel',
  'card.openQuestions': 'Open questions in spec.md ({count})',
  'card.checklists': 'Checklists',
  'card.acceptance': '{count:acceptanceScenario}',
  'card.noStory': 'Tasks with no story',
  'card.current': 'The active feature (.specify/feature.json)',
  'card.currentBadge': 'current',
  'card.contractsShort': '{count}c',
  'card.storyTooltip': '{title} — {tasks}, {done} ticked',
  'card.missing': 'No {label}',

  'drawer.overview': 'Overview',
  'drawer.tasks': 'Tasks',
  'drawer.checklists': 'Checklists',
  'drawer.checks': 'Checks',
  'drawer.docs': 'Documents',
  'drawer.history': 'History',
  'drawer.entities': 'Key entities',
  'drawer.assumptions': 'Assumptions',
  'drawer.dependencies': 'Dependencies',

  'checks.findings': 'Where the documents disagree',
  'checks.none': 'No disagreements. Every check that applies to this feature passed.',
  'checks.andMore': '…and {count} more',
  'checks.severity.blocker': 'blocker',
  'checks.severity.warn': 'warning',
  'checks.severity.info': 'note',
  'checks.constitution': 'Constitution check (plan.md)',
  'checks.noSection': 'plan.md has no constitution section.',
  'checks.noEvidence': 'The section states no verdict, so none is assumed.',
  'checks.verdict.pass': 'passed',
  'checks.verdict.fail': 'failed',
  'checks.verdict.unknown': 'no verdict',
  'checks.complexity': 'Declared complexity (plan.md)',
  'checks.complexityHint':
    'Exceptions this plan argued for in writing — a recorded decision, not an oversight.',
  'checks.violation': 'Violation',
  'checks.whyNeeded': 'Why needed',
  'checks.alternative': 'Simpler alternative rejected because',

  // The sentences the backend composes about a feature. `code` stays the stable
  // machine-readable thing; these are what a reader sees.
  'checks.msg.requirement-unreferenced':
    '{missing} of {total} requirements are named by no task, while others are: {listed}',
  'checks.msg.open-clarification': 'spec.md has an open clarification marker: {question}',
  'checks.msg.open-clarification.committed':
    'spec.md still has an open clarification marker while the feature is at {stage}: {question}',
  'checks.msg.status-disagrees':
    'spec.md still says “{status}” over a fully ticked tasks.md ({total}/{total})',
  'checks.msg.story-not-in-spec':
    'tasks.md assigns work to {story}, which spec.md does not define',
  'checks.msg.requirement-duplicate': '{id} is declared more than once in spec.md',
  'checks.msg.checklist-open-in-done':
    'every task is ticked but {open} of {total} checklist items are not',
  'checks.msg.constitution-failed': 'plan.md records a failed constitution check',
  'checks.msg.constitution-failed.evidence':
    'plan.md records a failed constitution check: {evidence}',

  'project.toolchain': 'spec-kit {version}',
  'project.constitution': 'constitution {version}',
  'project.drift': '{count:file} from the spec-kit install changed or missing',
  'project.workflows': '{count:workflow} declared: {list}',
  'drawer.modified': 'changed {when}',
  'drawer.created': 'created {date}',
  'drawer.summary': 'Summary',
  'drawer.status': 'Status',
  'drawer.taskCount': 'Tasks',
  'drawer.checklistCount': 'Checklists',
  'drawer.requirementCount': 'Requirements',
  'drawer.stories': 'User stories',
  'drawer.storyTasks': '{done}/{total} {total#task}',
  'drawer.storyTasksTooltip': 'Tasks in tasks.md tagged {story}: {done} of {total} ticked',
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
  'drawer.onlyOpen': 'Unticked only',
  'drawer.noTasksTitle': 'No tasks yet',
  'drawer.noTasksBody': 'This feature has no tasks.md — spec-kit has not cut the work yet.',
  'drawer.noChecklistsTitle': 'No checklists',
  'drawer.noChecklistsBody': 'The feature folder has no checklists/.',
  'drawer.pickDocument': 'Choose a document on the left.',
  'drawer.noCommitsTitle': 'No commits found',
  'drawer.noCommitsBody':
    'Either the project is not under git, or nothing in its history has touched specs/{feature}.',
  'drawer.loadFailed': 'Could not load {file}',

  // Artefact labels. The stem of a contract or a checklist is a filename and
  // stays as it is; the noun in front of it is ours.
  'doc.spec': 'Spec',
  'doc.plan': 'Plan',
  'doc.tasks': 'Tasks',
  'doc.research': 'Research',
  'doc.data-model': 'Data model',
  'doc.quickstart': 'Quickstart',
  'doc.contract': 'Contract · {name}',
  'doc.checklist': 'Checklist · {name}',

  'trend.reading': 'Reading git history…',
  'trend.unavailable': 'History unavailable',
  'trend.noData': 'No data',
  'trend.closed': 'ticked',
  'trend.totalTasks': 'total tasks',
  'trend.pointIsCommit': 'A point is a commit that touched specs/.',
  'trend.asOfLastCommit': 'As of the last commit, not the working tree.',
  'trend.delta': '+{delta} over {commits:commit}',
  'trend.stale': 'Longest without a commit',
  'trend.chartLabel': 'Tasks ticked per commit: {done} of {total} at the last commit',
  'trend.pointTooltip': '{done}/{total} {total#task} ({pct}%), {files} tasks.md',

  'trend.reason.not-git': 'This project is not a git repository.',
  'trend.reason.no-commits': 'This repository has no commits yet.',
  'trend.reason.log-failed': 'git log could not be read.',
  'trend.reason.no-specs-commit': 'No commit has touched specs/ yet.',
  'trend.reason.no-tasks-md': 'No tasks.md has ever been committed, so there is nothing to count.',
  'trend.reason.no-countable': 'No committed tasks.md holds any task to count.',
  'trend.reason.git-off': 'git reading is switched off (SPECDASH_GIT=0).',

  'search.open.hint': 'Search everything',
  'search.placeholder': 'Search specs, plans, tasks, requirements…',
  'search.nothing': 'Nothing matches “{query}”.',
  'search.didYouMean': 'Did you mean',
  'search.navigate': 'to move',
  'search.open': 'to open',
  'search.close': 'to close',
  'search.foundBy': '{total:match} {how} · {ms} ms',
  'search.byTokens': 'by words',
  'search.bySubstring': 'by substring',
  'search.kind.feature': 'feature',
  'search.kind.story': 'story',
  'search.kind.task': 'task',
  'search.kind.requirement': 'requirement',
  'search.kind.checklist': 'checklist',
  'search.kind.document': 'document',

  'unit.bytes': '{n} B',
  'unit.kb': '{n} KB',
  'unit.mb': '{n} MB',

  'time.justNow': 'just now',
  'time.minutes': '{n} min ago',
  'time.hours': '{n} h ago',
  'time.days': '{n} d ago',
  'time.months': '{n} mo ago',
  'time.years': '{n} y ago',
  'time.never': '—',
}

export type Key = keyof typeof EN

/** Total over the key set on purpose — see the note at the top of the file. */
const RU: Record<Key, string> = {
  'app.tagline': 'spec-kit · только чтение',
  'app.search': 'Фильтр по фичам, историям и задачам',
  'app.rescan': 'Сканировать заново',
  'app.theme': 'Тема',
  'app.language': 'Язык',
  'app.live': 'на связи',
  'app.connecting': 'подключение…',
  'app.offline': 'нет связи',
  'app.lastScan': 'Последнее сканирование',
  'app.scanning': 'Сканирование проектов…',
  'app.noProjects': 'Проекты spec-kit не найдены',
  'app.noProjectsHint':
    'Смонтируйте папку с проектами в /projects (PROJECTS_ROOT в .env). Проектом считается каталог, где есть .specify/ или specs/.',
  'app.brokenTitle': 'Проекты прочитаны не полностью ({count})',
  'app.nothingSelected': 'Не выбрано ни одного проекта.',
  'app.ms': '{ms} мс',

  'view.features': 'Фичи',
  'view.stories': 'Истории',
  'view.trend': 'Динамика',

  'board.columnTotals': '{done}/{total} {total#task} в колонке',
  'board.tasksTotal': '{done}/{total} {total#task}',
  'board.tasksOfShownFeatures': 'Задачи показанных фич',
  'board.tasksOfShownStories': 'Задачи показанных историй',

  'stage.specify.label': 'Спецификация',
  'stage.clarify.label': 'Уточнение',
  'stage.plan.label': 'План',
  'stage.tasks.label': 'Задачи',
  'stage.implement.label': 'Реализация',
  'stage.done.label': 'Готово',

  'stage.specify.hint': 'spec.md написан, больше пока ничего',
  'stage.clarify.hint': 'Уточнения внесены, plan.md ещё нет',
  'stage.plan.hint': 'plan.md есть, задачи не нарезаны',
  'stage.tasks.hint': 'Задачи нарезаны, ни одна не отмечена',
  'stage.implement.hint': 'Часть задач отмечена, часть нет',
  'stage.done.hint': 'Отмечены все задачи',

  'stage.specify.empty': 'Пока нет ничего, где есть только spec.md.',
  'stage.clarify.empty': 'Пока нет ничего уточнённого в ожидании plan.md.',
  'stage.plan.empty': 'Пока нет ничего, где plan.md есть, а tasks.md рядом — нет.',
  'stage.tasks.empty': 'Пока нет ничего, где задачи нарезаны, но ни одна не отмечена.',
  'stage.implement.empty': 'Пока нет ничего, где список задач начат, но не закончен.',
  'stage.done.empty': 'Пока нет ничего, где отмечены все задачи.',

  'card.open': 'Открыть {title}',
  'card.tasks': 'Задачи',
  'card.parallel': 'Помечена [P] в tasks.md — можно делать параллельно',
  'card.openQuestions': 'Открытые вопросы в spec.md ({count})',
  'card.checklists': 'Чек-листы',
  'card.acceptance': '{count:acceptanceScenario}',
  'card.noStory': 'Задачи без истории',
  'card.current': 'Активная фича (.specify/feature.json)',
  'card.currentBadge': 'текущая',
  'card.contractsShort': '{count}к',
  'card.storyTooltip': '{title} — {tasks}, отмечено {done}',
  'card.missing': 'Нет {label}',

  'drawer.overview': 'Обзор',
  'drawer.tasks': 'Задачи',
  'drawer.checklists': 'Чек-листы',
  'drawer.checks': 'Проверки',
  'drawer.docs': 'Документы',
  'drawer.history': 'История',
  'drawer.entities': 'Ключевые сущности',
  'drawer.assumptions': 'Допущения',
  'drawer.dependencies': 'Зависимости',

  'checks.findings': 'В чём документы расходятся',
  'checks.none': 'Расхождений нет. Все применимые проверки пройдены.',
  'checks.andMore': '…и ещё {count}',
  'checks.severity.blocker': 'блокер',
  'checks.severity.warn': 'предупреждение',
  'checks.severity.info': 'замечание',
  'checks.constitution': 'Проверка конституции (plan.md)',
  'checks.noSection': 'В plan.md нет раздела с проверкой конституции.',
  'checks.noEvidence': 'В разделе нет вердикта, и он не домысливается.',
  'checks.verdict.pass': 'пройдена',
  'checks.verdict.fail': 'не пройдена',
  'checks.verdict.unknown': 'нет вердикта',
  'checks.complexity': 'Заявленная сложность (plan.md)',
  'checks.complexityHint':
    'Исключения, письменно обоснованные в плане, — записанное решение, а не недосмотр.',
  'checks.violation': 'Нарушение',
  'checks.whyNeeded': 'Зачем понадобилось',
  'checks.alternative': 'Почему отвергнут более простой вариант',

  'checks.msg.requirement-unreferenced':
    'Ни одна задача не называет {missing} из {total} требований, хотя другие названы: {listed}',
  'checks.msg.open-clarification': 'В spec.md остался маркер уточнения: {question}',
  'checks.msg.open-clarification.committed':
    'В spec.md остался маркер уточнения, хотя фича уже на стадии «{stage}»: {question}',
  'checks.msg.status-disagrees':
    'В spec.md всё ещё написано «{status}», хотя в tasks.md отмечены все задачи ({total}/{total})',
  'checks.msg.story-not-in-spec':
    'tasks.md отдаёт работу истории {story}, которой нет в spec.md',
  'checks.msg.requirement-duplicate': '{id} объявлено в spec.md больше одного раза',
  'checks.msg.checklist-open-in-done':
    'Все задачи отмечены, но в чек-листах не отмечено {open} пунктов из {total}',
  'checks.msg.constitution-failed': 'В plan.md записана не пройденная проверка конституции',
  'checks.msg.constitution-failed.evidence':
    'В plan.md записана не пройденная проверка конституции: {evidence}',

  'project.toolchain': 'spec-kit {version}',
  'project.constitution': 'конституция {version}',
  'project.drift': 'Файлы spec-kit изменены или отсутствуют ({count})',
  'project.workflows': 'Объявлены workflow ({count}): {list}',
  'drawer.modified': 'изменено {when}',
  'drawer.created': 'создано {date}',
  'drawer.summary': 'Суть',
  'drawer.status': 'Статус',
  'drawer.taskCount': 'Задачи',
  'drawer.checklistCount': 'Чек-листы',
  'drawer.requirementCount': 'Требования',
  'drawer.stories': 'Пользовательские истории',
  'drawer.storyTasks': '{done}/{total} {total#task}',
  'drawer.storyTasksTooltip': 'Задачи в tasks.md с тегом {story}: отмечено {done} из {total}',
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
  'drawer.onlyOpen': 'Только неотмеченные',
  'drawer.noTasksTitle': 'Задач ещё нет',
  'drawer.noTasksBody': 'В этой фиче нет tasks.md — spec-kit ещё не нарезал работу.',
  'drawer.noChecklistsTitle': 'Чек-листов нет',
  'drawer.noChecklistsBody': 'В папке фичи нет checklists/.',
  'drawer.pickDocument': 'Выберите документ слева.',
  'drawer.noCommitsTitle': 'Коммитов не найдено',
  'drawer.noCommitsBody':
    'Либо проект не под управлением git, либо в его истории нет коммитов, затрагивающих specs/{feature}.',
  'drawer.loadFailed': 'Не удалось загрузить {file}',

  'doc.spec': 'Спецификация',
  'doc.plan': 'План',
  'doc.tasks': 'Задачи',
  'doc.research': 'Исследование',
  'doc.data-model': 'Модель данных',
  'doc.quickstart': 'Быстрый старт',
  'doc.contract': 'Контракт · {name}',
  'doc.checklist': 'Чек-лист · {name}',

  'trend.reading': 'Чтение истории git…',
  'trend.unavailable': 'История недоступна',
  'trend.noData': 'Нет данных',
  'trend.closed': 'отмечено',
  'trend.totalTasks': 'всего задач',
  'trend.pointIsCommit': 'Точка — коммит, затронувший specs/.',
  'trend.asOfLastCommit': 'По последнему коммиту, а не по рабочей копии.',
  'trend.delta': '+{delta} за {commits:commit}',
  'trend.stale': 'Дольше всего без коммитов',
  'trend.chartLabel': 'Отмеченные задачи по коммитам: {done} из {total} на последнем коммите',
  'trend.pointTooltip': '{done}/{total} {total#task} ({pct}%), {files} tasks.md',

  'trend.reason.not-git': 'Проект не под управлением git.',
  'trend.reason.no-commits': 'В репозитории ещё нет коммитов.',
  'trend.reason.log-failed': 'Не удалось прочитать git log.',
  'trend.reason.no-specs-commit': 'Ни один коммит ещё не затронул specs/.',
  'trend.reason.no-tasks-md': 'tasks.md ни разу не попадал в коммит — считать нечего.',
  'trend.reason.no-countable': 'Ни в одном закоммиченном tasks.md нет задач для подсчёта.',
  'trend.reason.git-off': 'Чтение git отключено (SPECDASH_GIT=0).',

  'search.open.hint': 'Искать везде',
  'search.placeholder': 'Поиск по спецификациям, планам, задачам и требованиям…',
  'search.nothing': 'По запросу «{query}» ничего не найдено.',
  'search.didYouMean': 'Возможно, вы имели в виду',
  'search.navigate': 'листать',
  'search.open': 'открыть',
  'search.close': 'закрыть',
  'search.foundBy': 'найдено {total:match} {how} · {ms} мс',
  'search.byTokens': 'по словам',
  'search.bySubstring': 'по подстроке',
  'search.kind.feature': 'фича',
  'search.kind.story': 'история',
  'search.kind.task': 'задача',
  'search.kind.requirement': 'требование',
  'search.kind.checklist': 'чек-лист',
  'search.kind.document': 'документ',

  'unit.bytes': '{n} Б',
  'unit.kb': '{n} КБ',
  'unit.mb': '{n} МБ',

  'time.justNow': 'только что',
  'time.minutes': '{n} мин назад',
  'time.hours': '{n} ч назад',
  'time.days': '{n} дн. назад',
  'time.months': '{n} мес. назад',
  'time.years': '{n} г. назад',
  'time.never': '—',
}

const DICT: Record<Lang, Record<Key, string>> = { en: EN, ru: RU }

/** Counted nouns, because `1 историй` is what naive interpolation produces. */
const PLURALS = {
  // [one, other]
  en: {
    feature: ['feature', 'features'],
    story: ['story', 'stories'],
    task: ['task', 'tasks'],
    project: ['project', 'projects'],
    commit: ['commit', 'commits'],
    contract: ['contract', 'contracts'],
    file: ['file', 'files'],
    workflow: ['workflow', 'workflows'],
    match: ['match', 'matches'],
    acceptanceScenario: ['acceptance scenario', 'acceptance scenarios'],
    blocker: ['blocker', 'blockers'],
    warn: ['warning', 'warnings'],
    info: ['note', 'notes'],
  },
  // [one, few, many]
  ru: {
    feature: ['фича', 'фичи', 'фич'],
    story: ['история', 'истории', 'историй'],
    task: ['задача', 'задачи', 'задач'],
    project: ['проект', 'проекта', 'проектов'],
    commit: ['коммит', 'коммита', 'коммитов'],
    contract: ['контракт', 'контракта', 'контрактов'],
    file: ['файл', 'файла', 'файлов'],
    // Indeclinable in Russian, and carried through the same machinery so that
    // nothing has to know it is a special case.
    workflow: ['workflow', 'workflow', 'workflow'],
    match: ['совпадение', 'совпадения', 'совпадений'],
    acceptanceScenario: ['сценарий приёмки', 'сценария приёмки', 'сценариев приёмки'],
    blocker: ['блокер', 'блокера', 'блокеров'],
    warn: ['предупреждение', 'предупреждения', 'предупреждений'],
    info: ['замечание', 'замечания', 'замечаний'],
  },
} satisfies Record<Lang, Record<string, string[]>>

export type Noun = keyof (typeof PLURALS)['en']

function form(lang: Lang, n: number): number {
  const abs = Math.abs(n)
  if (lang === 'en') return abs === 1 ? 0 : 1
  // A fraction takes the many-form in Russian — `1,5 задачи` is not a thing —
  // and the modulo rules below are only meaningful for whole numbers.
  if (!Number.isInteger(abs)) return 2
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1
  return 2
}

/** The agreeing form of a noun, without the number in front of it. */
export function pluralWord(lang: Lang, n: number, noun: Noun): string {
  const forms: string[] = PLURALS[lang][noun] ?? PLURALS.en[noun]
  return forms[form(lang, n)] ?? forms[forms.length - 1]
}

export function plural(lang: Lang, n: number, noun: Noun): string {
  return `${n} ${pluralWord(lang, n, noun)}`
}

/**
 * `{name}` substitutes, `{name:noun}` prints the number with its agreeing noun,
 * and `{name#noun}` prints the noun alone — for `{done}/{total} задачи`, where
 * the number is already on screen and printing it twice would be wrong.
 *
 * The declining forms live in the template rather than at the call site because
 * that is where the grammar problem is: which word bends, and around which
 * number, is a property of the sentence, and the sentence is here.
 */
const PLACEHOLDER = /\{(\w+)(?:([:#])(\w+))?\}/g

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const template = DICT[lang]?.[key] ?? EN[key] ?? key
  if (!vars) return template
  return template.replace(PLACEHOLDER, (whole, name: string, op: string | undefined, noun) => {
    if (!(name in vars)) return whole
    const value = vars[name]
    if (!op || !(noun in PLURALS[lang])) return String(value)
    const count = Number(value)
    if (!Number.isFinite(count)) return String(value)
    return op === '#'
      ? pluralWord(lang, count, noun as Noun)
      : plural(lang, count, noun as Noun)
  })
}

const STAGE_IDS = ['specify', 'clarify', 'plan', 'tasks', 'implement', 'done']

/**
 * Prose the backend composed: a key, its variables, and the English sentence it
 * wrote alongside them. An unknown key renders that sentence rather than a
 * dotted id — a dictionary that has not caught up with a rule is a translation
 * gap, not a blank panel.
 */
export function translateBackend(
  lang: Lang,
  key: string | null | undefined,
  vars: Record<string, string | number> | undefined,
  fallback: string,
): string {
  if (!key || !(key in EN)) return fallback
  // A stage id crossing the wire inside a sentence is still a label on this
  // board, and reads as one.
  const stage = vars?.stage
  const resolved =
    typeof stage === 'string' && STAGE_IDS.includes(stage)
      ? { ...vars, stage: translate(lang, `stage.${stage}.label` as Key) }
      : vars
  return translate(lang, key as Key, resolved)
}

/** Interface copy that happens to live in a utility. */
export function relativeTime(lang: Lang, epochSeconds: number): string {
  if (!epochSeconds) return translate(lang, 'time.never')
  const seconds = Math.max(0, Date.now() / 1000 - epochSeconds)
  if (seconds < 45) return translate(lang, 'time.justNow')
  // Rounded before it is compared, so no bucket can render its own upper bound:
  // 59.6 minutes is `1 h ago`, never `60 min ago`.
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return translate(lang, 'time.minutes', { n: minutes })
  const hours = Math.round(seconds / 3600)
  if (hours < 24) return translate(lang, 'time.hours', { n: hours })
  const days = Math.round(seconds / 86400)
  if (days < 30) return translate(lang, 'time.days', { n: days })
  const months = Math.round(days / 30)
  if (months < 12) return translate(lang, 'time.months', { n: months })
  return translate(lang, 'time.years', { n: Math.round(days / 365) })
}

/** Bytes in the reader's language: its units and its decimal separator. */
export function formatBytes(lang: Lang, bytes: number): string {
  if (bytes < 1024) return translate(lang, 'unit.bytes', { n: bytes })
  const number = (value: number) => value.toLocaleString(lang, { maximumFractionDigits: 1 })
  if (bytes < 1024 * 1024) return translate(lang, 'unit.kb', { n: number(bytes / 1024) })
  return translate(lang, 'unit.mb', { n: number(bytes / 1024 / 1024) })
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
  /** Prose composed by the backend: key, variables, English fallback. */
  tb: (
    key: string | null | undefined,
    vars: Record<string, string | number> | undefined,
    fallback: string,
  ) => string
  n: (count: number, noun: Noun) => string
  ago: (epochSeconds: number) => string
  bytes: (bytes: number) => string
  setLang: (lang: Lang) => void
}

export const LangContext = createContext<Translator>({
  lang: 'en',
  t: (key, vars) => translate('en', key, vars),
  tb: (key, vars, fallback) => translateBackend('en', key, vars, fallback),
  n: (count, noun) => plural('en', count, noun),
  ago: (seconds) => relativeTime('en', seconds),
  bytes: (value) => formatBytes('en', value),
  setLang: () => undefined,
})

export function useT(): Translator {
  return useContext(LangContext)
}
