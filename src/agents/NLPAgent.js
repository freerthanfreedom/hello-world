const BaseAgent = require('./BaseAgent');

const INTENT_PATTERNS = [
  { intent: 'CREATE_TODO',    patterns: [/\b(add|create|new|만들|추가)\b/i] },
  { intent: 'LIST_TODOS',     patterns: [/\b(list|show|all|목록|보여)\b/i] },
  { intent: 'COMPLETE_TODO',  patterns: [/\b(done|finish|complete|완료|끝)\b/i] },
  { intent: 'DELETE_TODO',    patterns: [/\b(delete|remove|삭제|지워)\b/i] },
  { intent: 'GET_STATS',      patterns: [/\b(stats|statistics|summary|통계|요약)\b/i] },
  { intent: 'GET_TOP_N',      patterns: [/\b(top|priority|urgent|우선순위|중요)\b/i] },
  { intent: 'GET_OVERDUE',    patterns: [/\b(overdue|late|지연|기한)\b/i] },
];

const PRIORITY_PATTERNS = [
  { label: 'high',   re: /\b(high|urgent|critical|높음|긴급)\b/i },
  { label: 'medium', re: /\b(medium|normal|중간|보통)\b/i },
  { label: 'low',    re: /\b(low|minor|낮음|사소)\b/i },
];

/**
 * NLPAgent — parses natural language commands into structured tasks.
 * Handles: PARSE_COMMAND
 */
class NLPAgent extends BaseAgent {
  constructor() {
    super('NLPAgent');
  }

  async _process({ type, payload }) {
    if (type !== 'PARSE_COMMAND') throw new Error(`NLPAgent: unknown type "${type}"`);
    const text = payload?.text ?? '';
    const intent = this._detectIntent(text);
    const priority = this._detectPriority(text);
    const title = this._extractTitle(text, intent);
    return { intent, priority, title, raw: text };
  }

  _detectIntent(text) {
    for (const { intent, patterns } of INTENT_PATTERNS) {
      if (patterns.some(p => p.test(text))) return intent;
    }
    return 'UNKNOWN';
  }

  _detectPriority(text) {
    for (const { label, re } of PRIORITY_PATTERNS) {
      if (re.test(text)) return label;
    }
    return 'medium';
  }

  _extractTitle(text, intent) {
    const stopWords = ['add', 'create', 'new', 'a', 'an', 'the', 'todo', 'task',
      '만들어', '추가해', '새', '할일', '작업', 'urgent', 'high', 'low', 'priority'];
    return text
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !stopWords.includes(w.toLowerCase()))
      .join(' ')
      .trim() || 'Untitled Task';
  }
}

module.exports = new NLPAgent();
