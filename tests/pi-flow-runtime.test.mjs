import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import runtime from '../pi-flow-runtime.js';

const {
  phaseForState,
  previousPreparationPhase,
  preparationBackTarget,
  preparationReturnCleanup,
  isPreparationTransition,
  planPreparationStateTransition,
  restoreTarget,
  canTriggerMeal,
  createTimerRegistry,
  createLogger,
  isDebugEnabled,
} = runtime;

test('phaseForState maps every known state to its phase', () => {
  assert.equal(phaseForState('country'), 0);
  assert.equal(phaseForState('timer'), 1);
  assert.equal(phaseForState('angle'), 2);
  assert.equal(phaseForState('destination'), 3);
  assert.equal(phaseForState('ready_to_fly'), 4);
});

test('phaseForState returns null for unknown values', () => {
  assert.equal(phaseForState('unknown'), null);
  assert.equal(phaseForState('COUNTRY'), null);
  assert.equal(phaseForState(null), null);
  assert.equal(phaseForState(undefined), null);
});

test('previousPreparationPhase returns the preceding preparation phase', () => {
  assert.equal(previousPreparationPhase(1), 0);
  assert.equal(previousPreparationPhase(2), 1);
  assert.equal(previousPreparationPhase(3), 2);
  assert.equal(previousPreparationPhase(4), 3);
});

test('previousPreparationPhase excludes phases without a preparation predecessor', () => {
  assert.equal(previousPreparationPhase(0), null);
  assert.equal(previousPreparationPhase(5), null);
  assert.equal(previousPreparationPhase(-1), null);
  assert.equal(previousPreparationPhase(1.5), null);
  assert.equal(previousPreparationPhase('2'), null);
});

test('preparationBackTarget maps interactive preparation steps backward', () => {
  assert.deepEqual(preparationBackTarget(1, 'timer'), {
    phase: 0,
    state: 'country',
  });
  assert.deepEqual(preparationBackTarget(2, 'angle'), {
    phase: 1,
    state: 'timer',
  });
  assert.deepEqual(preparationBackTarget(3, 'destination'), {
    phase: 2,
    state: 'angle',
  });
});

test('preparationBackTarget skips destination when returning from ready to fly', () => {
  assert.deepEqual(preparationBackTarget(4, 'ready_to_fly'), {
    phase: 2,
    state: 'angle',
  });
});

test('preparationBackTarget rejects flight phases and mismatched states', () => {
  assert.equal(preparationBackTarget(5, 'ready_to_fly'), null);
  assert.equal(preparationBackTarget(6, 'angle'), null);
  assert.equal(preparationBackTarget(1, 'angle'), null);
  assert.equal(preparationBackTarget(4, 'destination'), null);
  assert.equal(preparationBackTarget(2, 'unknown'), null);
  assert.equal(preparationBackTarget(0, 'country'), null);
});

test('isPreparationTransition accepts only safe preparation transitions and stays', () => {
  const allowed = [
    [0, 0], [0, 1],
    [1, 0], [1, 1], [1, 2],
    [2, 1], [2, 2], [2, 3], [2, 4],
    [3, 2], [3, 3], [3, 4],
    [4, 2], [4, 3], [4, 4],
  ];

  for (const [currentPhase, targetPhase] of allowed) {
    assert.equal(
      isPreparationTransition(currentPhase, targetPhase),
      true,
      `${currentPhase}→${targetPhase} should be allowed`,
    );
  }
});

test('isPreparationTransition rejects every other transition', () => {
  const allowedKeys = new Set([
    '0→0', '0→1',
    '1→0', '1→1', '1→2',
    '2→1', '2→2', '2→3', '2→4',
    '3→2', '3→3', '3→4',
    '4→2', '4→3', '4→4',
  ]);

  for (let currentPhase = 0; currentPhase <= 4; currentPhase += 1) {
    for (let targetPhase = 0; targetPhase <= 4; targetPhase += 1) {
      const key = `${currentPhase}→${targetPhase}`;
      if (!allowedKeys.has(key)) {
        assert.equal(
          isPreparationTransition(currentPhase, targetPhase),
          false,
          `${key} should be rejected`,
        );
      }
    }
  }

  for (const [currentPhase, targetPhase] of [
    [4, 5],
    [5, 4],
    [5, 5],
    [1.5, 2],
    [2, '3'],
  ]) {
    assert.equal(isPreparationTransition(currentPhase, targetPhase), false);
  }
});

test('planPreparationStateTransition plans allowed preparation transitions atomically', () => {
  const cases = [
    [0, 'country', { state: 'country', phase: 0, maxReachedPhase: 0 }],
    [0, 'timer', { state: 'timer', phase: 1, maxReachedPhase: 1 }],
    [2, 'ready_to_fly', { state: 'ready_to_fly', phase: 4, maxReachedPhase: 4 }],
    [3, 'angle', { state: 'angle', phase: 2, maxReachedPhase: 2 }],
  ];

  for (const [currentPhase, state, expected] of cases) {
    assert.deepEqual(planPreparationStateTransition(currentPhase, state), expected);
  }
});

test('planPreparationStateTransition rejects unknown and unsafe preparation transitions', () => {
  assert.equal(planPreparationStateTransition(0, 'ready_to_fly'), null);
  assert.equal(planPreparationStateTransition(3, 'country'), null);
  assert.equal(planPreparationStateTransition(4, 'timer'), null);
  assert.equal(planPreparationStateTransition(2, 'unknown'), null);
  assert.equal(planPreparationStateTransition(8, 'country'), null);
});

test('planPreparationStateTransition preserves flight phases while updating UI state', () => {
  assert.deepEqual(planPreparationStateTransition(5, 'country'), {
    state: 'country',
    phase: 5,
    maxReachedPhase: null,
  });
  assert.deepEqual(planPreparationStateTransition(7, 'ready_to_fly'), {
    state: 'ready_to_fly',
    phase: 7,
    maxReachedPhase: null,
  });
});

test('preparationReturnCleanup returns immutable cleanup policies', () => {
  const phase2 = preparationReturnCleanup(2);
  const phase1 = preparationReturnCleanup(1);
  const phase0 = preparationReturnCleanup(0);

  assert.deepEqual(phase2, {
    clearDownstream: true,
    preservesAngle: true,
    clearAngle: false,
    clearTimer: false,
  });
  assert.deepEqual(phase1, {
    clearDownstream: false,
    preservesAngle: false,
    clearAngle: true,
    clearTimer: false,
  });
  assert.deepEqual(phase0, {
    clearDownstream: false,
    preservesAngle: false,
    clearAngle: false,
    clearTimer: true,
  });
  assert.equal(Object.isFrozen(phase2), true);
  assert.equal(Object.isFrozen(phase1), true);
  assert.equal(Object.isFrozen(phase0), true);
  assert.equal(preparationReturnCleanup(3), null);
});

test('restoreTarget selects phase 5 only above five minutes', () => {
  assert.equal(restoreTarget(300001), 5);
  assert.equal(restoreTarget(Infinity), 5);
  assert.equal(restoreTarget(300000), 6);
  assert.equal(restoreTarget(0), 6);
  assert.equal(restoreTarget(-1), 6);
});

test('canTriggerMeal accepts a qualifying position change at ready time', () => {
  assert.equal(canTriggerMeal({
    phase: 5,
    triggered: false,
    active: false,
    sleepStartTime: 1,
    oldPosition: 0,
    newPosition: 1,
    now: 100,
    readyAt: 100,
  }), true);
});

test('canTriggerMeal defaults readyAt to zero', () => {
  assert.equal(canTriggerMeal({
    phase: 5,
    sleepStartTime: 1,
    oldPosition: false,
    newPosition: true,
    now: 0,
  }), true);
});

test('canTriggerMeal rejects every disqualifying condition', () => {
  const valid = {
    phase: 5,
    triggered: false,
    active: false,
    sleepStartTime: 1,
    oldPosition: 0,
    newPosition: 1,
    now: 100,
    readyAt: 100,
  };

  assert.equal(canTriggerMeal({ ...valid, phase: 4 }), false);
  assert.equal(canTriggerMeal({ ...valid, triggered: true }), false);
  assert.equal(canTriggerMeal({ ...valid, active: true }), false);
  assert.equal(canTriggerMeal({ ...valid, sleepStartTime: 0 }), false);
  assert.equal(canTriggerMeal({ ...valid, oldPosition: null }), false);
  assert.equal(canTriggerMeal({ ...valid, oldPosition: undefined }), false);
  assert.equal(canTriggerMeal({ ...valid, oldPosition: 1 }), false);
  assert.equal(canTriggerMeal({ ...valid, now: 99 }), false);
});

test('timer registry replaces and clears an existing timer', () => {
  const cleared = [];
  const timers = createTimerRegistry((id) => cleared.push(id));

  timers.set('flight', 11);
  assert.equal(timers.has('flight'), true);

  timers.set('flight', 12);
  assert.deepEqual(cleared, [11]);
  assert.equal(timers.has('flight'), true);

  timers.clear('flight');
  assert.deepEqual(cleared, [11, 12]);
  assert.equal(timers.has('flight'), false);

  timers.clear('missing');
  assert.deepEqual(cleared, [11, 12]);
});

test('timer registry clearAll clears every registered timer', () => {
  const cleared = [];
  const timers = createTimerRegistry((id) => cleared.push(id));

  timers.set('a', 1);
  timers.set('b', 2);
  timers.clearAll();

  assert.deepEqual(cleared, [1, 2]);
  assert.equal(timers.has('a'), false);
  assert.equal(timers.has('b'), false);
});

function recordingSink() {
  const calls = [];
  return {
    calls,
    sink: {
      error: (...args) => calls.push(['error', ...args]),
      warn: (...args) => calls.push(['warn', ...args]),
      info: (...args) => calls.push(['info', ...args]),
      debug: (...args) => calls.push(['debug', ...args]),
    },
  };
}

test('logger forwards production levels while suppressing debug', () => {
  const { calls, sink } = recordingSink();
  const logger = createLogger({ debug: false, sink });

  logger.error('broken', 500);
  logger.warn('careful');
  logger.info('ready');
  logger.debug('details');

  assert.deepEqual(calls, [
    ['error', 'broken', 500],
    ['warn', 'careful'],
    ['info', 'ready'],
  ]);
});

test('logger forwards debug when enabled', () => {
  const { calls, sink } = recordingSink();
  const logger = createLogger({ debug: true, sink });

  logger.debug('details', { phase: 5 });

  assert.deepEqual(calls, [['debug', 'details', { phase: 5 }]]);
});

test('logger once deduplicates by key and resetOnce allows logging again', () => {
  const { calls, sink } = recordingSink();
  const logger = createLogger({ debug: false, sink });

  logger.once('meal', 'first');
  logger.once('meal', 'second');
  logger.once('arrival', 'third');
  assert.deepEqual(calls, [
    ['info', 'first'],
    ['info', 'third'],
  ]);

  logger.resetOnce();
  logger.once('meal', 'after reset');
  assert.deepEqual(calls.at(-1), ['info', 'after reset']);
});

test('isDebugEnabled detects query-string and storage flags', () => {
  assert.equal(isDebugEnabled({ search: '?debug=1' }, null), true);
  assert.equal(isDebugEnabled({ search: '?other=x&debug=1&next=y' }, null), true);
  assert.equal(isDebugEnabled({ search: '?debug=0' }, {
    getItem: (key) => key === 'morganDebug' ? '1' : null,
  }), true);
});

test('isDebugEnabled is false without an enabled flag', () => {
  assert.equal(isDebugEnabled({ search: '?debug=0' }, {
    getItem: () => '0',
  }), false);
  assert.equal(isDebugEnabled({}, {}), false);
  assert.equal(isDebugEnabled(null, null), false);
});

test('switchState calls the tested planner before assigning currentState', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');
  const switchStart = html.indexOf('function switchState(newState)');
  const switchEnd = html.indexOf('// 更新下一步按鈕文字和狀態', switchStart);
  const source = html.slice(switchStart, switchEnd);
  const plannerCall = source.indexOf(
    'MorganRuntime.planPreparationStateTransition(currentPhase, newState)',
  );
  const stateMutation = source.indexOf('currentState = newState;');

  assert.notEqual(switchStart, -1);
  assert.notEqual(switchEnd, -1);
  assert.ok(plannerCall >= 0);
  assert.ok(stateMutation > plannerCall);
});

test('preparation navigation does not preassign currentState before switchState', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');
  const switchStart = html.indexOf('function switchState(newState)');
  const switchEnd = html.indexOf('// 更新下一步按鈕文字和狀態', switchStart);
  const outsideSwitchState = html.slice(0, switchStart) + html.slice(switchEnd);

  assert.doesNotMatch(
    outsideSwitchState,
    /currentState\s*=\s*State\.(?:TIMER|ANGLE|DESTINATION|READY_TO_FLY)\s*;[\s\S]{0,200}?switchState\s*\(/,
  );
});
