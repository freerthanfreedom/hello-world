/**
 * In-memory shared state store for all agents.
 * Acts as the single source of truth.
 */
class TodoStore {
  constructor() {
    this._todos = new Map();
    this._nextId = 1;
    this._eventLog = [];
  }

  createTodo({ title, description = '', priority = 'medium', tags = [], dueDate = null }) {
    const id = String(this._nextId++);
    const todo = {
      id,
      title,
      description,
      priority,
      tags,
      dueDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    this._todos.set(id, todo);
    this._log('CREATE', todo);
    return { ...todo };
  }

  getTodo(id) {
    const todo = this._todos.get(id);
    return todo ? { ...todo } : null;
  }

  listTodos(filter = {}) {
    let items = [...this._todos.values()];
    if (filter.status) items = items.filter(t => t.status === filter.status);
    if (filter.priority) items = items.filter(t => t.priority === filter.priority);
    if (filter.tag) items = items.filter(t => t.tags.includes(filter.tag));
    return items.map(t => ({ ...t }));
  }

  updateTodo(id, patch) {
    const todo = this._todos.get(id);
    if (!todo) return null;
    const updated = { ...todo, ...patch, id, updatedAt: new Date().toISOString() };
    this._todos.set(id, updated);
    this._log('UPDATE', updated);
    return { ...updated };
  }

  deleteTodo(id) {
    const todo = this._todos.get(id);
    if (!todo) return false;
    this._todos.delete(id);
    this._log('DELETE', { id });
    return true;
  }

  getStats() {
    const all = [...this._todos.values()];
    return {
      total: all.length,
      byStatus: {
        pending: all.filter(t => t.status === 'pending').length,
        inProgress: all.filter(t => t.status === 'inProgress').length,
        completed: all.filter(t => t.status === 'completed').length,
      },
      byPriority: {
        high: all.filter(t => t.priority === 'high').length,
        medium: all.filter(t => t.priority === 'medium').length,
        low: all.filter(t => t.priority === 'low').length,
      },
    };
  }

  getEventLog() {
    return [...this._eventLog];
  }

  _log(action, payload) {
    this._eventLog.push({ action, payload, timestamp: new Date().toISOString() });
  }
}

module.exports = new TodoStore();
