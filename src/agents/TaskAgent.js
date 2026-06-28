const BaseAgent = require('./BaseAgent');
const store = require('../store/TodoStore');

/**
 * TaskAgent — CRUD operations for todos.
 * Handles: CREATE_TODO, READ_TODO, LIST_TODOS, UPDATE_TODO, DELETE_TODO, COMPLETE_TODO
 */
class TaskAgent extends BaseAgent {
  constructor() {
    super('TaskAgent');
  }

  async _process({ type, payload }) {
    switch (type) {
      case 'CREATE_TODO': {
        const todo = store.createTodo(payload);
        return { action: 'created', todo };
      }
      case 'READ_TODO': {
        const todo = store.getTodo(payload.id);
        if (!todo) throw new Error(`Todo ${payload.id} not found`);
        return { todo };
      }
      case 'LIST_TODOS': {
        const todos = store.listTodos(payload ?? {});
        return { todos, count: todos.length };
      }
      case 'UPDATE_TODO': {
        const { id, ...patch } = payload;
        const todo = store.updateTodo(id, patch);
        if (!todo) throw new Error(`Todo ${id} not found`);
        return { action: 'updated', todo };
      }
      case 'DELETE_TODO': {
        const deleted = store.deleteTodo(payload.id);
        if (!deleted) throw new Error(`Todo ${payload.id} not found`);
        return { action: 'deleted', id: payload.id };
      }
      case 'COMPLETE_TODO': {
        const todo = store.updateTodo(payload.id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
        if (!todo) throw new Error(`Todo ${payload.id} not found`);
        return { action: 'completed', todo };
      }
      default:
        throw new Error(`TaskAgent: unknown task type "${type}"`);
    }
  }
}

module.exports = new TaskAgent();
