export const meta = {
  name: 'study-build-loop',
  description: 'One step of the study-map build loop: plan (ideate + goals), execute (design, build, review vs design, review vs goal), or integrate',
  whenToUse: 'Driven by the study-session skill. args: { mode: plan|execute|integrate, iteration, total?, notes?, residue?, goals? }. Expects docs/ASSIGNMENT.md, docs/CONSTRAINTS.md, docs/goal-schema.json and tools/smoke.mjs in the repo.',
  phases: [
    { title: 'Ideate', detail: 'fable: find the unifying thread, propose improvements', model: 'fable' },
    { title: 'Plan', detail: 'fable: split the work into verifiable goals (formal schema)', model: 'fable' },
    { title: 'Design', detail: 'sonnet: detailed design + pseudocode per goal', model: 'sonnet' },
    { title: 'Build', detail: 'sonnet: implement each design', model: 'sonnet' },
    { title: 'Review vs design', detail: 'sonnet: check each build against its design and pseudocode', model: 'sonnet' },
    { title: 'Review vs goal', detail: 'sonnet: check each delivery against its acceptance criteria', model: 'sonnet' },
    { title: 'Fix', detail: 'sonnet: address review findings', model: 'sonnet' },
    { title: 'Integrate', detail: 'sonnet: integrate, full smoke, clear residue', model: 'sonnet' },
  ],
}

const MODE = args && args.mode
const K = args && args.iteration
if (!MODE || !K) throw new Error('args.mode and args.iteration are required')
const TOTAL = (args && args.total) || 7
const MAX_FIX = 3
const REPO = (args && args.repo) || 'the current working directory'

const PREAMBLE = `You are one agent in a multi-agent build loop that is producing an interactive study map for a student's upcoming test. The subject, the student's own words, the review problems and the topics are in docs/ASSIGNMENT.md. Repo: ${REPO} (static site, no build step; work from the repo root). This is iteration ${K} of ${TOTAL}.
Before doing anything, read: docs/ASSIGNMENT.md (what and why; the student's own words are in section 1), docs/CONSTRAINTS.md (binding engineering and design contract), and, if they exist, docs/STORY.md (the unifying narrative) and docs/ARCHITECTURE.md (module map and interfaces).
The north star: the test questions should feel less daunting, not like procedures to memorize but like places in one visual story the student revisits. The seed of that story is in docs/ASSIGNMENT.md; candidate unifying threads are in docs/THREADS.md.`

// ---------- schemas ----------
const ACCEPT = {
  type: 'object', required: ['id', 'statement', 'verify', 'how'],
  properties: {
    id: { type: 'string' }, statement: { type: 'string' },
    verify: { type: 'string', enum: ['unit_test', 'smoke', 'interaction_script', 'screenshot_review', 'code_inspection'] },
    how: { type: 'string' },
  },
}
const GOAL = {
  type: 'object',
  required: ['id', 'title', 'wave', 'depends_on', 'kind', 'story_thread', 'assignment_refs', 'owns', 'reads', 'interfaces', 'deliverable', 'acceptance', 'out_of_scope', 'size'],
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, wave: { type: 'integer' },
    depends_on: { type: 'array', items: { type: 'string' } },
    kind: { type: 'string', enum: ['foundation', 'engine', 'station', 'explainer', 'problem-walkthrough', 'lab', 'video', 'integration', 'polish'] },
    story_thread: { type: 'string' },
    assignment_refs: { type: 'array', items: { type: 'string' } },
    owns: { type: 'array', items: { type: 'string' } },
    reads: { type: 'array', items: { type: 'string' } },
    interfaces: { type: 'string' }, deliverable: { type: 'string' },
    acceptance: { type: 'array', items: ACCEPT },
    out_of_scope: { type: 'array', items: { type: 'string' } },
    size: { type: 'string', enum: ['S', 'M', 'L'] },
  },
}
const IDEATE_SCHEMA = {
  type: 'object', required: ['threads', 'story_written', 'critique', 'improvements'],
  properties: {
    threads: { type: 'array', items: { type: 'object', required: ['name', 'one_liner', 'how_it_unifies', 'appears_in'], properties: {
      name: { type: 'string' }, one_liner: { type: 'string' }, how_it_unifies: { type: 'string' }, appears_in: { type: 'array', items: { type: 'string' } } } } },
    story_written: { type: 'boolean' },
    critique: { type: 'string' },
    improvements: { type: 'array', items: { type: 'object', required: ['id', 'title', 'kind', 'why', 'impact', 'targets', 'assignment_refs'], properties: {
      id: { type: 'string' }, title: { type: 'string' }, kind: { type: 'string', enum: ['new', 'improve', 'fix', 'unify'] },
      why: { type: 'string' }, impact: { type: 'integer' }, targets: { type: 'array', items: { type: 'string' } },
      assignment_refs: { type: 'array', items: { type: 'string' } } } } },
  },
}
const PLAN_SCHEMA = {
  type: 'object', required: ['iteration', 'thread_summary', 'goals', 'coverage', 'notes'],
  properties: {
    iteration: { type: 'integer' }, thread_summary: { type: 'string' },
    goals: { type: 'array', items: GOAL },
    coverage: { type: 'array', items: { type: 'object', required: ['ref', 'goal_ids'], properties: { ref: { type: 'string' }, goal_ids: { type: 'array', items: { type: 'string' } } } } },
    notes: { type: 'string' },
  },
}
const DESIGN_SCHEMA = {
  type: 'object', required: ['design_path', 'summary', 'files', 'expected_values', 'verification_plan', 'risks'],
  properties: {
    design_path: { type: 'string' }, summary: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    expected_values: { type: 'array', items: { type: 'object', required: ['label', 'value'], properties: { label: { type: 'string' }, value: { type: 'string' } } } },
    verification_plan: { type: 'array', items: { type: 'object', required: ['criterion_id', 'method'], properties: { criterion_id: { type: 'string' }, method: { type: 'string' } } } },
    risks: { type: 'array', items: { type: 'string' } },
  },
}
const BUILD_SCHEMA = {
  type: 'object', required: ['files_changed', 'commands', 'deviations', 'requests_for_other_owners', 'notes'],
  properties: {
    files_changed: { type: 'array', items: { type: 'string' } },
    commands: { type: 'array', items: { type: 'object', required: ['cmd', 'exit_code', 'summary'], properties: { cmd: { type: 'string' }, exit_code: { type: 'integer' }, summary: { type: 'string' } } } },
    deviations: { type: 'array', items: { type: 'object', required: ['what', 'why'], properties: { what: { type: 'string' }, why: { type: 'string' } } } },
    requests_for_other_owners: { type: 'array', items: { type: 'object', required: ['file', 'change'], properties: { file: { type: 'string' }, change: { type: 'string' } } } },
    notes: { type: 'string' },
  },
}
const ISSUE = { type: 'object', required: ['severity', 'where', 'problem', 'fix'], properties: {
  severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } } }
const REVIEW_SCHEMA = {
  type: 'object', required: ['verdict', 'summary', 'issues', 'criteria'],
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] }, summary: { type: 'string' },
    issues: { type: 'array', items: ISSUE },
    criteria: { type: 'array', items: { type: 'object', required: ['id', 'met', 'evidence'], properties: { id: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' } } } },
  },
}
const INTEGRATE_SCHEMA = {
  type: 'object', required: ['summary', 'fixed', 'remaining', 'unit_tests', 'smoke'],
  properties: {
    summary: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } },
    remaining: { type: 'array', items: { type: 'object', required: ['where', 'problem'], properties: { where: { type: 'string' }, problem: { type: 'string' } } } },
    unit_tests: { type: 'string' }, smoke: { type: 'string' },
  },
}
const AUDIT_SCHEMA = {
  type: 'object', required: ['summary', 'residue'],
  properties: {
    summary: { type: 'string' },
    residue: { type: 'array', items: { type: 'object', required: ['where', 'problem', 'evidence'], properties: { where: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' } } } },
  },
}

const PROBLEM_IDS = 'every review problem id and every topic id listed in docs/ASSIGNMENT.md'
const THREAD_CANDIDATES = '(read docs/THREADS.md for this subject\'s candidate threads, and the seed story in docs/ASSIGNMENT.md)'

// ---------- helpers ----------
const autoOwned = (g) => [`docs/designs/iter-${K}/${g.id}.md`, `tests/unit/${g.id}.test.mjs`, `tests/interact/${g.id}.mjs`]
const shotsDir = (g) => `docs/review/iter-${K}/${g.id}`
const goalJson = (g) => (g.acceptance ? JSON.stringify(g, null, 2) : `(The full formal spec of goal "${g.id}" is the entry with that id in the "goals" array of docs/goals/iter-${K}.json. Read it now; it is binding. It owns: ${(g.owns || []).join(', ')}.)`)
const fmtIssues = (issues) => (issues || []).map((i, n) => `${n + 1}. [${i.severity}] ${i.where}: ${i.problem}\n   Suggested fix: ${i.fix}`).join('\n')

function validatePlan(plan) {
  const goals = plan.goals || []
  const ids = new Set()
  const problems = []
  for (const g of goals) {
    if (ids.has(g.id)) problems.push(`duplicate goal id ${g.id}`)
    ids.add(g.id)
  }
  for (const g of goals) {
    g.depends_on = (g.depends_on || []).filter((d) => { if (!ids.has(d)) { problems.push(`${g.id} depends on unknown ${d} (dropped)`); return false } return true })
  }
  // enforce dependency ordering and exclusive ownership per wave by bumping waves
  const byId = Object.fromEntries(goals.map((g) => [g.id, g]))
  let changed = true, guard = 0
  while (changed && guard++ < 50) {
    changed = false
    for (const g of goals) {
      for (const d of g.depends_on) {
        if (byId[d].wave >= g.wave) { g.wave = byId[d].wave + 1; changed = true; problems.push(`${g.id} moved to wave ${g.wave} (after ${d})`) }
      }
    }
    const waves = [...new Set(goals.map((g) => g.wave))].sort((a, b) => a - b)
    for (const w of waves) {
      const seen = {}
      for (const g of goals.filter((x) => x.wave === w)) {
        const clash = (g.owns || []).find((f) => seen[f])
        if (clash) { problems.push(`${g.id} owns ${clash} also owned by ${seen[clash]} in wave ${w}; moved to wave ${w + 1}`); g.wave = w + 1; changed = true; continue }
        for (const f of g.owns || []) seen[f] = g.id
      }
    }
  }
  const waves = {}
  for (const g of goals) (waves[g.wave] = waves[g.wave] || []).push(g.id)
  return { problems, waves }
}

// ---------- prompts ----------
function ideatePrompt() {
  const notes = args.notes || ''
  const situation = K === 1
    ? 'The repo contains only scaffolding (docs, vendored libraries, tools/smoke.mjs). You are designing the whole experience from scratch.'
    : `The site already exists (see docs/goals/iter-*.json, docs/review/iter-*/integration.md, docs/review/iter-*-orchestrator.md and the code under js/).\nThe orchestrator's review of the previous iteration, against the assignment:\n${notes}`
  const look = K === 1
    ? 'Study every review problem, topic, definition and theorem in docs/ASSIGNMENT.md. Solve each review problem yourself, so you know where the elegance is.'
    : `Run \`node tools/smoke.mjs --dark --out docs/review/iter-${K}/before\` and LOOK at the screenshots with your Read tool (it shows images). Read the station code. Form an honest critique: what is confusing, ugly, mathematically shaky, framed as a procedure, broken on a phone, or disconnected from the story? Which test problems still feel daunting?`
  return `${PREAMBLE}

ROLE: Unifier and Improver (stage 0 of iteration ${K}). You think hardest about the story and the student's understanding. You do not write code.

SITUATION: ${situation}

DO:
1. ${look}
2. Find the single thread, or small set of interlocking threads, that unifies ALL the explanations in a truly beautiful and elegant way. ${K === 1 ? 'Start from the seed in ASSIGNMENT section 5 and go beyond it.' : 'Go deeper than the current docs/STORY.md: sharpen, simplify, find the connection that is still missing. Do not just restate it.'} A thread earns its place only if it makes specific test problems feel obvious. Candidate threads to test against every problem:
${THREAD_CANDIDATES}
3. Write docs/STORY.md (you own it; rewrite freely). It must contain: (a) the thread(s) in plain, warm language for a student the night before the test; (b) the Story Map: an ordered list of places (stations), each with what the student sees, touches, and realizes there, and the thread lines that connect places; (c) a table pinning EVERY review problem (${PROBLEM_IDS}) to a place, naming the thread that makes it easy and the one-sentence aha (with the correct final answer); (d) the shared visual vocabulary used everywhere (extend the design language in docs/CONSTRAINTS.md); (e) every free-form playground or interactive tool the student asked for in ASSIGNMENT section 1, described concretely, and how each ties back to the story; (f) how a student uses the site in a study session.
4. Propose improvements ranked by impact on "the test questions feel less daunting": new visualizations, better numerical explainers (every computation shown in both addresses with live numbers), interactive demos, fixes. Where a moving picture explains better than a still one and docs/CONSTRAINTS.md has a media track, propose manim explainer videos (with their narration script outline) as well. Make each concrete enough that a planner can turn it into verifiable goals. ${K === 1 ? 'For iteration 1, list the complete initial set of places, shared engines and tools (including the Mapping Lab and the 4D viewer) needed for a complete first version that covers every review problem.' : 'Aim for 5-9 strong items. Include fixes for anything broken or confusing you saw, and at least one item that strengthens the unifying thread across stations (cross-links, shared visual motifs, a recurring demo).'}

You may only write docs/STORY.md${K === 1 ? '' : ` and screenshots under docs/review/iter-${K}/`}.`
}

function planPrompt(ideas) {
  const extra = K === 1 ? '' : `\nOrchestrator notes on the previous iteration (binding; anything flagged as broken must be planned):\n${args.notes || '(none)'}\nOpen residue carried over:\n${JSON.stringify(args.residue || [], null, 2)}\n`
  return `${PREAMBLE}

ROLE: Goal Planner (stage 1 of iteration ${K}). Turn the Unifier's ideation into formally specified, independently verifiable goals that sonnet designers and builders execute in parallel. Each goal flows: Designer (detailed design + pseudocode) -> Builder -> Review A (build vs design) -> Review B (delivery vs your acceptance criteria). Your criteria are what Review B executes, so make them executable.

IDEATION (from the Unifier):
${JSON.stringify(ideas, null, 2)}
${extra}
RULES:
- Every goal follows the formal goal schema in docs/goal-schema.json. Goal ids: i${K}-<kebab-name>.
- Verifiable acceptance: every criterion names a method a reviewer can actually run. unit_test: exact expected values copied from a hand-checked solution. smoke: "node tools/smoke.mjs --route <id>" passes desktop and phone with zero problems. interaction_script: concrete steps (drag handle #x to plane point 2+i, expect #readout to contain "|z| = 2.236"). screenshot_review: one specific visual claim checkable in a PNG. code_inspection: one specific property of the code. No vague criteria like "looks good" or "is intuitive". Include at least one criterion tying the goal to the story (the thread from docs/STORY.md is visible on screen, not just stated).
- Sizing: each goal is finishable by one builder in one session (about one station or one engine, at most about 1200 lines). Split anything bigger.
- Ownership: "owns" lists every file the goal creates or edits; ownership is exclusive within a wave. Each goal also automatically owns docs/designs/iter-${K}/<id>.md, tests/unit/<id>.test.mjs and tests/interact/<id>.mjs; do not list those. Shared shell files (index.html, js/app.js, css/theme.css, css/components.css) belong to at most one goal per wave.
- Waves: wave 0 = modules other goals import; wave 1 = their consumers; wave 2 only if truly needed. depends_on may only point at goals in earlier waves. Fewer waves finish sooner, so specify interfaces precisely and let consumers build against the specification in parallel where possible.
- Registry: you maintain js/registry.js yourself. Before returning, create or update it with a STATIONS entry for every station that exists or is planned this iteration (pure data, per the CONSTRAINTS station contract, with id, title, chapter, module, problems, summary). No goal owns js/registry.js unless it changes the file's shape.
- Architecture: write or update docs/ARCHITECTURE.md: module map; exact exported signatures of every shared module (existing or planned this iteration); the complex-number representation; how stations deep-link to a preset state (bare-token routes such as #problem-1-4-2 or #roots, no key=value); how stations cross-link along story threads; how canvases read theme colours. Designers rely on these signatures, so make them precise.${K === 1 ? ' In iteration 1 the foundation (app shell, router, theme, and the shared maths and rendering engines) must be wave 0 so every station in wave 1 can rely on it.' : ''}
- Coverage: return a coverage list mapping review problems and topics (${PROBLEM_IDS}) to goals. ${K === 1 ? 'Iteration 1 must cover every one of them.' : 'List only what this iteration touches.'}
- Media: if docs/CONSTRAINTS.md has a media track and the ideation proposes videos or narration, plan them as kind "video" goals that follow that section (scene + narration JSON, owned per video). Their acceptance must include rendering with node tools/videos/render.mjs --only <id> --quality l and checking stills extracted with ffmpeg. media/manifest.js is generated; no goal owns it.
- Target ${K === 1 ? '12-18 goals' : '5-10 goals'}.${K === 1 ? '' : ' Prefer improving and unifying what exists over adding near-duplicates. Make sure the new goals do not regress existing stations; name the existing files they edit in owns.'}
- Write the plan JSON (exactly what you return) to docs/goals/iter-${K}.json.

You may write only js/registry.js, docs/ARCHITECTURE.md and docs/goals/iter-${K}.json.`
}

function designPrompt(g) {
  return `${PREAMBLE}

ROLE: Designer (stage 2) for goal ${g.id}. Produce a detailed design with pseudocode that a separate builder implements without guessing. Do not write code files.

GOAL (formal spec from the planner):
${goalJson(g)}

Read the code that already exists in the files this goal reads or builds on (actual exported names win over ARCHITECTURE.md if they differ; note any difference). Other goals in this wave are being built concurrently from ARCHITECTURE.md signatures; rely on those signatures for modules that do not exist yet.

Write docs/designs/iter-${K}/${g.id}.md containing:
1. Goal restatement, the story thread this carries and how it shows on screen, the review problems/topics covered.
2. UX: wireframes (ASCII) for desktop and phone (~390px); every control with its element id, label and behaviour; pointer, touch and keyboard interaction; empty, loading and error states; the actual copy text (plain, direct, for a student the night before a test).
3. Visual encoding per docs/CONSTRAINTS.md design language, for both themes.
4. Module API: exports with exact signatures, data structures, events, lifecycle (mount/unmount cleanup).
5. Algorithms as numbered pseudocode precise enough to implement directly (rendering loops, hit testing, maths, animation timing, resolution management).
6. Mathematics: every formula used; for every review problem this goal covers, the full worked solution in BOTH Cartesian and polar form, with hand-checked numbers. Double-check each value; these become unit-test expectations.
7. Verification plan: for each acceptance criterion id, the exact command, unit test cases (with expected values), interaction-script steps (tests/interact/${g.id}.mjs, run with node tools/smoke.mjs --route <id> --script tests/interact/${g.id}.mjs) and what passing looks like.
8. Edge cases, performance plan, accessibility, reduced motion, phone layout.
9. Out of scope.

You may write only docs/designs/iter-${K}/${g.id}.md. Return the summary object.`
}

function buildPrompt(g, design) {
  return `${PREAMBLE}

ROLE: Builder (stage 3) for goal ${g.id}. Implement the design faithfully.

GOAL:
${goalJson(g)}

DESIGN: docs/designs/iter-${K}/${g.id}.md (read it fully). Designer summary: ${design.summary}
Expected values from the design: ${JSON.stringify(design.expected_values)}

RULES:
- You may create or edit only: ${[...g.owns, ...autoOwned(g)].join(', ')}. Anything else that needs changing goes in requests_for_other_owners.
- Other builders are working on other files at the same time. If npm test shows failures in tests you do not own, ignore them (mention them in notes).
- Follow the design. If you must deviate (it is wrong or impossible), make the smallest sound deviation and record it with the reason.
- Write tests/unit/${g.id}.test.mjs for the pure logic, using the design's expected values. Write tests/interact/${g.id}.mjs for acceptance criteria that need interaction (it exports default async function (page, ctx); see tools/smoke.mjs header).
- Verify before returning: npm test (your tests pass); node tools/smoke.mjs --route <your station route(s)> --out ${shotsDir(g)} [--script tests/interact/${g.id}.mjs] passes with zero problems; then LOOK at the desktop and phone screenshots with your Read tool and fix anything that looks broken, overlapping, unreadable or off-palette. If your goal has no route of its own (an engine), exercise it through a unit test and, if possible, an existing route or a temporary test page under tests/ that you delete before returning.
- Do not commit.

Return the build report.`
}

function fixPrompt(g, design, issues, against) {
  return `${PREAMBLE}

ROLE: Builder, fix round, for goal ${g.id}. A reviewer checked your delivery against the ${against === 'design' ? 'design and pseudocode (docs/designs/iter-' + K + '/' + g.id + '.md)' : 'goal acceptance criteria'} and found these issues:
${fmtIssues(issues)}

GOAL:
${goalJson(g)}

Fix every blocker and major issue, and the minor ones where the fix is cheap and safe. If an issue is wrong, explain why in notes rather than changing correct code. You may edit only: ${[...g.owns, ...autoOwned(g)].join(', ')}. Re-run npm test and node tools/smoke.mjs --route <route(s)> --out ${shotsDir(g)} [--script tests/interact/${g.id}.mjs], look at the screenshots, and return the build report.`
}

function reviewAPrompt(g, design, build, round) {
  return `${PREAMBLE}

ROLE: Review A (stage 4), build vs design, for goal ${g.id}${round ? ` (re-review after fix round ${round})` : ''}. You are an adversarial reviewer. Do not edit code; you may run commands and write screenshots under ${shotsDir(g)}/reviewA.

DESIGN: docs/designs/iter-${K}/${g.id}.md
BUILD REPORT: ${JSON.stringify(build)}
GOAL (for context): ${goalJson(g)}

Check, item by item, that the build implements the design: every exported API and signature, every numbered pseudocode step (read the code path that implements it), every control id, label and behaviour, the copy, the visual encoding from docs/CONSTRAINTS.md, phone layout, lifecycle cleanup, and every formula and expected value. Run npm test and node tools/smoke.mjs for the goal's routes and look at the screenshots. Judge recorded deviations: accept them only if they are sound.

Verdict "pass" only if there are no blocker or major issues. A major issue is anything a student would notice as wrong or broken, any wrong maths, a missing designed feature, or a contract violation. List minor issues too. Put one entry per design section in criteria (id = section name, met, evidence).`
}

function reviewBPrompt(g, design, build, round) {
  return `${PREAMBLE}

ROLE: Review B (stage 5), delivery vs goal, for goal ${g.id}${round ? ` (re-review after fix round ${round})` : ''}. You verify the goal's acceptance criteria by executing them yourself. Do not edit product code; you may write throwaway scripts and screenshots under ${shotsDir(g)}/reviewB.

GOAL:
${goalJson(g)}
BUILD REPORT: ${JSON.stringify(build)}

For EVERY acceptance criterion: run its verification exactly as written (unit tests, node tools/smoke.mjs --route ... desktop and phone, interaction scripts, reading the PNG screenshots with your Read tool, inspecting code). Record met/evidence per criterion id. Then check the delivery against the purpose of the whole project: is the story thread from docs/STORY.md visible on screen rather than a bare procedure? Is every number shown for a review problem correct? Recompute them independently. Any contract violation (external request, overflow at phone width, literal colours that break dark mode, console errors)?

Verdict "pass" only if every criterion is met and there are no blocker or major issues.`
}

function integratePrompt(residue, round) {
  return `${PREAMBLE}

ROLE: Integrator for iteration ${K}${round ? ` (round ${round + 1})` : ''}. All goal builds for this iteration are finished and nothing else is running, so you may edit any file in the repo (except docs/ASSIGNMENT.md and docs/CONSTRAINTS.md).

Goals this iteration: docs/goals/iter-${K}.json. Designs: docs/designs/iter-${K}/.
Residue to clear (unresolved review findings, requests for other owners, previous audit findings):
${JSON.stringify(residue, null, 2)}

DO:
1. Run npm test (all) and node tools/smoke.mjs --dark --out docs/review/iter-${K}/integration. Fix every failure.
2. Look at the desktop, phone and dark screenshots of EVERY route with your Read tool. Fix anything broken, overlapping, unreadable, off-palette, or inconsistent between stations (shared header/nav, spacing, type scale, the shared colour code).
3. Clear the residue list above: fix each item, or explain in remaining why it should not be fixed.
4. Wire the story together: js/registry.js entries for every station, navigation works from the home/story map to every station and back, deep links (#problem-...) land on the right preset, cross-links along story threads point at stations that exist.
5. Re-run npm test and smoke until both are clean.
6. Write docs/review/iter-${K}/integration.md: what you fixed, what remains and why, final test and smoke output summary.`
}

function auditPrompt(integ, residue) {
  return `${PREAMBLE}

ROLE: Residue Auditor for iteration ${K}. Independently confirm there is no residue left. Do not edit product code.

Integrator report: ${JSON.stringify(integ)}
Residue the integrator was asked to clear: ${JSON.stringify(residue)}

DO: run npm test and node tools/smoke.mjs --dark --out docs/review/iter-${K}/audit; read docs/goals/iter-${K}.json and spot-check every goal's acceptance criteria against the integrated build (run the interaction scripts in tests/interact/ for this iteration's goals); confirm each residue item is truly resolved (look at the code and the screenshots); recompute any review-problem answer shown on screen that you can see. Report every remaining problem with evidence. An empty residue list means you verified it, not that you skipped it.`
}

// ---------- modes ----------
if (MODE === 'plan') {
  phase('Ideate')
  const ideas = await agent(ideatePrompt(), { label: `ideate:iter${K}`, phase: 'Ideate', model: 'fable', schema: IDEATE_SCHEMA })
  if (!ideas) throw new Error('ideation agent failed')
  log(`Ideation: ${ideas.threads.length} thread(s), ${ideas.improvements.length} improvement(s)`)
  phase('Plan')
  const plan = await agent(planPrompt(ideas), { label: `plan:iter${K}`, phase: 'Plan', model: 'fable', schema: PLAN_SCHEMA })
  if (!plan) throw new Error('planner agent failed')
  const { problems, waves } = validatePlan(plan)
  for (const p of problems) log(`plan check: ${p}`)
  log(`Plan: ${plan.goals.length} goals in waves ${JSON.stringify(waves)}`)
  return { ideas, plan, waves, plan_problems: problems }
}

if (MODE === 'execute') {
  const goals = args.goals || []
  if (!goals.length) throw new Error('execute mode needs args.goals')
  log(`Executing ${goals.length} goal(s): ${goals.map((g) => g.id).join(', ')}`)

  async function runGoal(g) {
    const design = await agent(designPrompt(g), { label: `design:${g.id}`, phase: 'Design', model: 'sonnet', schema: DESIGN_SCHEMA })
    if (!design) return { id: g.id, status: 'failed', stage: 'design', residue: [{ where: g.id, problem: 'design agent failed' }] }
    let build = await agent(buildPrompt(g, design), { label: `build:${g.id}`, phase: 'Build', model: 'sonnet', schema: BUILD_SCHEMA })
    if (!build) return { id: g.id, status: 'failed', stage: 'build', residue: [{ where: g.id, problem: 'build agent failed' }] }
    const requests = [...(build.requests_for_other_owners || [])]
    let rounds = 0, a = null, b = null
    const history = []
    while (true) {
      a = await agent(reviewAPrompt(g, design, build, rounds), { label: `reviewA:${g.id}${rounds ? ':r' + rounds : ''}`, phase: 'Review vs design', model: 'sonnet', schema: REVIEW_SCHEMA })
      if (a && a.verdict === 'fail') {
        history.push({ review: 'A', round: rounds, issues: a.issues })
        if (rounds >= MAX_FIX) break
        const fixed = await agent(fixPrompt(g, design, a.issues, 'design'), { label: `fix:${g.id}:r${rounds + 1}`, phase: 'Fix', model: 'sonnet', schema: BUILD_SCHEMA })
        if (fixed) { build = fixed; requests.push(...(fixed.requests_for_other_owners || [])) }
        rounds++
        continue
      }
      b = await agent(reviewBPrompt(g, design, build, rounds), { label: `reviewB:${g.id}${rounds ? ':r' + rounds : ''}`, phase: 'Review vs goal', model: 'sonnet', schema: REVIEW_SCHEMA })
      if (b && b.verdict === 'fail') {
        history.push({ review: 'B', round: rounds, issues: b.issues })
        if (rounds >= MAX_FIX) break
        const fixed = await agent(fixPrompt(g, design, b.issues, 'goal'), { label: `fix:${g.id}:r${rounds + 1}`, phase: 'Fix', model: 'sonnet', schema: BUILD_SCHEMA })
        if (fixed) { build = fixed; requests.push(...(fixed.requests_for_other_owners || [])) }
        rounds++
        continue
      }
      break
    }
    const passA = !!a && a.verdict === 'pass'
    const passB = !!b && b.verdict === 'pass'
    const residue = []
    for (const r of [a, b]) for (const i of (r && r.issues) || []) residue.push({ where: `${g.id}: ${i.where}`, problem: `[${i.severity}] ${i.problem}`, fix: i.fix })
    for (const q of requests) residue.push({ where: q.file, problem: `request from ${g.id}: ${q.change}` })
    const status = passA && passB ? 'passed' : 'residue'
    log(`${g.id}: ${status} after ${rounds} fix round(s)`)
    return { id: g.id, status, rounds, reviewA: a && { verdict: a.verdict, summary: a.summary }, reviewB: b && { verdict: b.verdict, summary: b.summary, criteria: b.criteria }, files: build.files_changed, deviations: build.deviations, residue, history_count: history.length }
  }

  const results = await pipeline(goals, runGoal)
  return { iteration: K, results: results.map((r, i) => r || { id: goals[i].id, status: 'failed', residue: [{ where: goals[i].id, problem: 'goal pipeline threw' }] }) }
}

if (MODE === 'integrate') {
  phase('Integrate')
  let residue = args.residue || []
  let integ = null, audit = null, round = 0
  while (round < 3) {
    integ = await agent(integratePrompt(residue, round), { label: `integrate:iter${K}:r${round + 1}`, phase: 'Integrate', model: 'sonnet', schema: INTEGRATE_SCHEMA })
    audit = await agent(auditPrompt(integ, residue), { label: `audit:iter${K}:r${round + 1}`, phase: 'Integrate', model: 'sonnet', schema: AUDIT_SCHEMA })
    residue = (audit && audit.residue) || []
    log(`Integration round ${round + 1}: ${residue.length} residue item(s) left`)
    if (!residue.length) break
    round++
  }
  return { iteration: K, integration: integ, audit, residue }
}

throw new Error(`unknown mode ${MODE}`)
