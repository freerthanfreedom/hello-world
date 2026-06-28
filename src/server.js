const express = require('express');
const path = require('path');
const orchestrator = require('./Orchestrator');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── Todo CRUD ─────────────────────────────────────────────────────
app.get('/api/todos', async (req, res) => {
  const r = await orchestrator.dispatch({ type: 'LIST_TODOS', payload: req.query });
  res.json(r.result);
});

app.post('/api/todos', async (req, res) => {
  const r = await orchestrator.dispatch({ type: 'CREATE_TODO', payload: req.body });
  res.status(201).json(r.result);
});

app.patch('/api/todos/:id', async (req, res) => {
  const r = await orchestrator.dispatch({ type: 'UPDATE_TODO', payload: { id: req.params.id, ...req.body } });
  if (!r.ok) return res.status(404).json({ error: r.error });
  res.json(r.result);
});

app.delete('/api/todos/:id', async (req, res) => {
  const r = await orchestrator.dispatch({ type: 'DELETE_TODO', payload: { id: req.params.id } });
  if (!r.ok) return res.status(404).json({ error: r.error });
  res.json(r.result);
});

app.post('/api/todos/:id/complete', async (req, res) => {
  const r = await orchestrator.dispatch({ type: 'COMPLETE_TODO', payload: { id: req.params.id } });
  if (!r.ok) return res.status(404).json({ error: r.error });
  res.json(r.result);
});

// ── Analytics ─────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const [stats, rate, overdue] = await orchestrator.parallel([
    { type: 'GET_STATS', payload: {} },
    { type: 'GET_COMPLETION_RATE', payload: {} },
    { type: 'GET_OVERDUE', payload: {} },
  ]);
  res.json({ stats: stats.result, rate: rate.result, overdue: overdue.result });
});

app.get('/api/top', async (req, res) => {
  const r = await orchestrator.dispatch({ type: 'GET_TOP_N', payload: { n: Number(req.query.n) || 5 } });
  res.json(r.result);
});

// ── Priority ──────────────────────────────────────────────────────
app.post('/api/rerank', async (req, res) => {
  const r = await orchestrator.dispatch({ type: 'RERANK_ALL', payload: {} });
  res.json(r.result);
});

// ── NLP ───────────────────────────────────────────────────────────
app.post('/api/nlp', async (req, res) => {
  const r = await orchestrator.handleNaturalLanguage(req.body.text);
  res.json(r);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Todo app running → http://localhost:${PORT}`));
