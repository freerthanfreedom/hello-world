/**
 * demo.js — Runs the multi-agent orchestration system end-to-end
 * and prints a structured report to stdout.
 */
const orchestrator = require('./Orchestrator');

async function run() {
  console.log('\n=== Multi-Agent Todo Orchestration Demo ===\n');

  // ── 1. Create todos via TaskAgent ──────────────────────────────
  console.log('[ Step 1 ] Creating todos via Orchestrator → TaskAgent');
  const seeds = [
    { title: 'Fix critical login bug', description: 'Users cannot log in on Safari', priority: 'high', tags: ['bug', 'auth'] },
    { title: 'Write Q3 release notes', description: 'Document all new features for release', priority: 'medium', tags: ['docs'] },
    { title: 'Update README', description: 'Add setup instructions', priority: 'low', tags: ['docs'] },
    { title: 'ASAP: patch SQL injection vulnerability', description: 'Critical security issue found in search endpoint', priority: 'high', tags: ['security'] },
    { title: 'Schedule team meeting', description: 'Monthly retrospective', priority: 'medium', dueDate: new Date(Date.now() - 86_400_000).toISOString() },
    { title: 'Review PR #42', description: 'Auth refactor PR waiting for review', priority: 'medium', tags: ['review'] },
    { title: 'Optimize database queries', description: 'Slow reports endpoint needs attention', priority: 'medium', tags: ['performance'] },
  ];

  const created = [];
  for (const seed of seeds) {
    const r = await orchestrator.dispatch({ type: 'CREATE_TODO', payload: seed });
    created.push(r.result.todo);
    console.log(`  ✓ Created [${r.result.todo.id}] ${r.result.todo.title}`);
  }

  // ── 2. Fan-out: analytics + priority top-N in parallel ─────────
  console.log('\n[ Step 2 ] Parallel fan-out → AnalyticsAgent + PriorityAgent');
  const [statsRes, topRes] = await orchestrator.parallel([
    { type: 'GET_STATS', payload: {} },
    { type: 'GET_TOP_N', payload: { n: 3 } },
  ]);
  console.log('  Stats:', JSON.stringify(statsRes.result, null, 4).replace(/\n/g, '\n  '));
  console.log('  Top-3:', topRes.result.top.map(t => `[${t.priority}] ${t.title}`).join(' | '));

  // ── 3. PriorityAgent re-ranks everything ───────────────────────
  console.log('\n[ Step 3 ] PriorityAgent → RERANK_ALL');
  const rerank = await orchestrator.dispatch({ type: 'RERANK_ALL', payload: {} });
  rerank.result.items.forEach(t =>
    console.log(`  [score:${t.score}] [${t.priority}] ${t.title}`)
  );

  // ── 4. Complete a todo (pipeline) ─────────────────────────────
  console.log('\n[ Step 4 ] Pipeline: LIST → pick first → COMPLETE');
  const pipeResults = await orchestrator.pipeline([
    () => ({ type: 'LIST_TODOS', payload: { status: 'pending' } }),
    (prev) => ({ type: 'COMPLETE_TODO', payload: { id: prev.result.todos[0].id } }),
  ]);
  const completed = pipeResults[1].result.todo;
  console.log(`  ✓ Completed: [${completed.id}] ${completed.title}`);

  // ── 5. NLP natural language command ───────────────────────────
  console.log('\n[ Step 5 ] NLPAgent → natural language command');
  const nlCommands = [
    'Add urgent task: prepare demo slides',
    'Show me statistics',
    'List all todos',
  ];
  for (const cmd of nlCommands) {
    const r = await orchestrator.handleNaturalLanguage(cmd);
    console.log(`  CMD: "${cmd}"`);
    console.log(`    Intent: ${r.nlp?.intent}  Priority: ${r.nlp?.priority}`);
  }

  // ── 6. Analytics: overdue + completion rate ────────────────────
  console.log('\n[ Step 6 ] Analytics: overdue + completion rate');
  const [overdue, rate] = await orchestrator.parallel([
    { type: 'GET_OVERDUE', payload: {} },
    { type: 'GET_COMPLETION_RATE', payload: {} },
  ]);
  console.log(`  Overdue: ${overdue.result.overdueCount} item(s)`);
  console.log(`  Completion rate: ${rate.result.completionRate} (${rate.result.completed}/${rate.result.total})`);

  // ── 7. Activity summary ────────────────────────────────────────
  console.log('\n[ Step 7 ] Activity summary (last 24h)');
  const activity = await orchestrator.dispatch({ type: 'GET_ACTIVITY_SUMMARY', payload: { hours: 24 } });
  console.log('  Events:', activity.result.byAction);

  console.log('\n=== Demo complete ===\n');
}

run().catch(err => { console.error(err); process.exit(1); });
