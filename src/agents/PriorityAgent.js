const BaseAgent = require('./BaseAgent');
const store = require('../store/TodoStore');

const KEYWORD_WEIGHTS = {
  urgent: 10, critical: 10, asap: 9, deadline: 8,
  important: 6, fix: 5, bug: 5, release: 7,
  meeting: 4, review: 3, update: 2, check: 1,
};

/**
 * PriorityAgent — auto-classifies and re-ranks todos.
 * Handles: SUGGEST_PRIORITY, RERANK_ALL, GET_TOP_N
 */
class PriorityAgent extends BaseAgent {
  constructor() {
    super('PriorityAgent');
  }

  _scoreTodo(todo) {
    const text = `${todo.title} ${todo.description}`.toLowerCase();
    let score = 0;
    for (const [kw, w] of Object.entries(KEYWORD_WEIGHTS)) {
      if (text.includes(kw)) score += w;
    }
    if (todo.priority === 'high') score += 5;
    if (todo.priority === 'low') score -= 3;
    if (todo.dueDate) {
      const daysLeft = (new Date(todo.dueDate) - Date.now()) / 86_400_000;
      if (daysLeft < 1) score += 15;
      else if (daysLeft < 3) score += 8;
      else if (daysLeft < 7) score += 4;
    }
    return score;
  }

  _scoreToLabel(score) {
    if (score >= 10) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  async _process({ type, payload }) {
    switch (type) {
      case 'SUGGEST_PRIORITY': {
        const todo = store.getTodo(payload.id);
        if (!todo) throw new Error(`Todo ${payload.id} not found`);
        const score = this._scoreTodo(todo);
        const suggested = this._scoreToLabel(score);
        return { id: todo.id, title: todo.title, score, suggested };
      }
      case 'RERANK_ALL': {
        const todos = store.listTodos({ status: 'pending' });
        const ranked = todos
          .map(t => ({ ...t, _score: this._scoreTodo(t) }))
          .sort((a, b) => b._score - a._score);
        for (const t of ranked) {
          store.updateTodo(t.id, { priority: this._scoreToLabel(t._score) });
        }
        return { reranked: ranked.length, items: ranked.map(t => ({ id: t.id, title: t.title, score: t._score, priority: this._scoreToLabel(t._score) })) };
      }
      case 'GET_TOP_N': {
        const n = payload?.n ?? 5;
        const todos = store.listTodos({ status: 'pending' });
        const top = todos
          .map(t => ({ ...t, _score: this._scoreTodo(t) }))
          .sort((a, b) => b._score - a._score)
          .slice(0, n);
        return { top: top.map(t => ({ id: t.id, title: t.title, score: t._score, priority: t.priority })) };
      }
      default:
        throw new Error(`PriorityAgent: unknown task type "${type}"`);
    }
  }
}

module.exports = new PriorityAgent();
