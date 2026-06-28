/**
 * BaseAgent - all agents extend this.
 * Provides a standardized handle(task) interface and logging.
 */
class BaseAgent {
  constructor(name) {
    this.name = name;
    this._log = [];
  }

  /** @param {{ type: string, payload: object }} task */
  async handle(task) {
    const start = Date.now();
    this._log.push({ task: task.type, status: 'started', ts: new Date().toISOString() });
    try {
      const result = await this._process(task);
      this._log.push({ task: task.type, status: 'done', ms: Date.now() - start });
      return { agent: this.name, ok: true, result };
    } catch (err) {
      this._log.push({ task: task.type, status: 'error', message: err.message });
      return { agent: this.name, ok: false, error: err.message };
    }
  }

  /** Override in subclasses */
  async _process(task) {
    throw new Error(`${this.name} did not implement _process()`);
  }

  getLog() {
    return [...this._log];
  }
}

module.exports = BaseAgent;
