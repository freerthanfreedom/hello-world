const BaseAgent = require('./BaseAgent');
const store = require('../store/TodoStore');

/**
 * AnalyticsAgent — derives insights from the todo dataset.
 * Handles: GET_STATS, GET_COMPLETION_RATE, GET_OVERDUE, GET_ACTIVITY_SUMMARY
 */
class AnalyticsAgent extends BaseAgent {
  constructor() {
    super('AnalyticsAgent');
  }

  async _process({ type, payload }) {
    switch (type) {
      case 'GET_STATS': {
        return store.getStats();
      }

      case 'GET_COMPLETION_RATE': {
        const { total, byStatus } = store.getStats();
        const rate = total === 0 ? 0 : Math.round((byStatus.completed / total) * 100);
        return { total, completed: byStatus.completed, completionRate: `${rate}%` };
      }

      case 'GET_OVERDUE': {
        const now = Date.now();
        const overdue = store.listTodos({ status: 'pending' })
          .filter(t => t.dueDate && new Date(t.dueDate).getTime() < now);
        return { overdueCount: overdue.length, items: overdue };
      }

      case 'GET_ACTIVITY_SUMMARY': {
        const log = store.getEventLog();
        const last = payload?.hours ?? 24;
        const since = Date.now() - last * 3_600_000;
        const recent = log.filter(e => new Date(e.timestamp).getTime() >= since);
        const byAction = recent.reduce((acc, e) => {
          acc[e.action] = (acc[e.action] ?? 0) + 1;
          return acc;
        }, {});
        return { windowHours: last, eventCount: recent.length, byAction };
      }

      default:
        throw new Error(`AnalyticsAgent: unknown task type "${type}"`);
    }
  }
}

module.exports = new AnalyticsAgent();
