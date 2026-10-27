/**
 * Grades the lesson's rules after each tick and says when the verdict changed, so the worker posts a
 * `check` message only on change rather than sixty times a second. A tick that ends partway through
 * `setup` is not graded: the outputs are still at their power-on state or half set up, which would pass
 * an "off" rule for any program. Setup is graded while it waits, so a program that never leaves setup
 * (a `forever` under **when Arduino begins**) is still graded.
 */
import type { Phase } from '../runtime'
import type { Session } from '../session'
import { evaluateLogRules, type RuleResult } from './evaluate'
import type { Rule } from './rules'

export interface CheckReport {
  results: RuleResult[]
  /** Virtual time of the session when graded, in microseconds. */
  t: number
  phase: Phase
}

export class Watcher {
  private rules: Rule[] | null = null
  private last: string | null = null

  set(rules: Rule[] | null): void {
    this.rules = rules
    this.last = null
  }

  reset(): void {
    this.last = null
  }

  after(session: Session): CheckReport | null {
    if (!this.rules) return null
    const { t, phase } = session.snapshot()
    if (phase === 'setup' && !session.sleeping) return null
    const results = evaluateLogRules(this.rules, session.log)
    const key = JSON.stringify(results)
    if (key === this.last) return null
    this.last = key
    return { results, t, phase }
  }
}
