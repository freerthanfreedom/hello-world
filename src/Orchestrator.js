const taskAgent = require('./agents/TaskAgent');
const priorityAgent = require('./agents/PriorityAgent');
const analyticsAgent = require('./agents/AnalyticsAgent');
const nlpAgent = require('./agents/NLPAgent');

/**
 * Orchestrator — the central coordinator.
 *
 * Routing table maps task types to the responsible agent.
 * Compound workflows (e.g. NL command → intent → action) are handled
 * here as multi-step pipelines.
 */
const ROUTING = {
  // TaskAgent
  CREATE_TODO:   taskAgent,
  READ_TODO:     taskAgent,
  LIST_TODOS:    taskAgent,
  UPDATE_TODO:   taskAgent,
  DELETE_TODO:   taskAgent,
  COMPLETE_TODO: taskAgent,

  // PriorityAgent
  SUGGEST_PRIORITY: priorityAgent,
  RERANK_ALL:       priorityAgent,
  GET_TOP_N:        priorityAgent,

  // AnalyticsAgent
  GET_STATS:            analyticsAgent,
  GET_COMPLETION_RATE:  analyticsAgent,
  GET_OVERDUE:          analyticsAgent,
  GET_ACTIVITY_SUMMARY: analyticsAgent,

  // NLPAgent
  PARSE_COMMAND: nlpAgent,
};

class Orchestrator {
  constructor() {
    this._history = [];
  }

  /**
   * Dispatch a single structured task to the right agent.
   * @param {{ type: string, payload: object }} task
   */
  async dispatch(task) {
    const agent = ROUTING[task.type];
    if (!agent) {
      return { ok: false, error: `No agent registered for task type "${task.type}"` };
    }
    const response = await agent.handle(task);
    this._history.push({ task, response, ts: new Date().toISOString() });
    return response;
  }

  /**
   * Natural language entry point.
   * 1. NLPAgent parses the command.
   * 2. Orchestrator maps the detected intent to a structured task.
   * 3. The appropriate agent executes it.
   */
  async handleNaturalLanguage(text) {
    const nlpResult = await nlpAgent.handle({ type: 'PARSE_COMMAND', payload: { text } });
    if (!nlpResult.ok) return nlpResult;

    const { intent, priority, title } = nlpResult.result;

    const intentTask = this._buildIntentTask(intent, { title, priority, text });
    if (!intentTask) {
      return { ok: false, error: `Cannot map intent "${intent}" to a task`, nlp: nlpResult.result };
    }

    const actionResult = await this.dispatch(intentTask);
    return { ok: actionResult.ok, nlp: nlpResult.result, action: actionResult };
  }

  /**
   * Run multiple tasks in parallel (fan-out).
   * @param {Array<{ type: string, payload: object }>} tasks
   */
  async parallel(tasks) {
    return Promise.all(tasks.map(t => this.dispatch(t)));
  }

  /**
   * Run tasks sequentially, passing each result to the next (pipeline).
   * @param {Array<(prevResult: any) => { type: string, payload: object }>} taskFns
   */
  async pipeline(taskFns) {
    let prev = null;
    const results = [];
    for (const fn of taskFns) {
      const task = fn(prev);
      prev = await this.dispatch(task);
      results.push(prev);
    }
    return results;
  }

  getHistory() {
    return [...this._history];
  }

  _buildIntentTask(intent, { title, priority }) {
    switch (intent) {
      case 'CREATE_TODO':   return { type: 'CREATE_TODO',  payload: { title, priority } };
      case 'LIST_TODOS':    return { type: 'LIST_TODOS',   payload: {} };
      case 'COMPLETE_TODO': return { type: 'LIST_TODOS',   payload: { status: 'pending' } }; // caller resolves id
      case 'DELETE_TODO':   return { type: 'LIST_TODOS',   payload: {} };
      case 'GET_STATS':     return { type: 'GET_STATS',    payload: {} };
      case 'GET_TOP_N':     return { type: 'GET_TOP_N',    payload: { n: 5 } };
      case 'GET_OVERDUE':   return { type: 'GET_OVERDUE',  payload: {} };
      default: return null;
    }
  }
}

module.exports = new Orchestrator();
