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
  buildRestorePlan,
  createSingleFlight,
  createGenerationGuard,
  createPlaybackIdGenerator,
  isSuccessfulAudioStopResponse,
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

test('buildRestorePlan schedules phase 5 only above five minutes', () => {
  assert.deepEqual(buildRestorePlan(300001), {
    phase: 5,
    descentDelayMs: 1,
    overdue: false,
  });
});

test('buildRestorePlan enters phase 6 during the final five minutes', () => {
  assert.deepEqual(buildRestorePlan(300000), {
    phase: 6,
    descentDelayMs: null,
    overdue: false,
  });
  assert.deepEqual(buildRestorePlan(1), {
    phase: 6,
    descentDelayMs: null,
    overdue: false,
  });
});

test('buildRestorePlan marks zero and negative remaining time overdue in phase 6', () => {
  assert.deepEqual(buildRestorePlan(0), {
    phase: 6,
    descentDelayMs: null,
    overdue: true,
  });
  assert.deepEqual(buildRestorePlan(-1), {
    phase: 6,
    descentDelayMs: null,
    overdue: true,
  });
});

test('createSingleFlight shares an in-flight promise and clears after settlement', async () => {
  const singleFlight = createSingleFlight();
  let calls = 0;
  let resolveFirst;
  const firstFactory = () => {
    calls += 1;
    return new Promise((resolve) => {
      resolveFirst = resolve;
    });
  };

  const first = singleFlight.run(firstFactory);
  const concurrent = singleFlight.run(() => {
    calls += 1;
    return Promise.resolve('unexpected');
  });

  assert.equal(concurrent, first);
  assert.equal(calls, 1);
  resolveFirst('first');
  assert.equal(await first, 'first');

  const later = singleFlight.run(() => {
    calls += 1;
    return Promise.resolve('later');
  });
  assert.notEqual(later, first);
  assert.equal(await later, 'later');
  assert.equal(calls, 2);
});

test('createSingleFlight clears after rejection', async () => {
  const singleFlight = createSingleFlight();
  const failed = singleFlight.run(() => Promise.reject(new Error('failed')));

  await assert.rejects(failed, /failed/);
  assert.equal(await singleFlight.run(() => Promise.resolve('recovered')), 'recovered');
});

test('generation guard invalidates older work on newer start and cancel', () => {
  const guard = createGenerationGuard();
  const first = guard.next();
  assert.equal(guard.isCurrent(first), true);

  const second = guard.next();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);

  guard.cancel();
  assert.equal(guard.isCurrent(second), false);
});

test('audio stop success requires both HTTP and payload success', () => {
  assert.equal(isSuccessfulAudioStopResponse({ ok: true }, { success: true }), true);
  assert.equal(isSuccessfulAudioStopResponse({ ok: false }, { success: true }), false);
  assert.equal(isSuccessfulAudioStopResponse({ ok: true }, { success: false }), false);
  assert.equal(isSuccessfulAudioStopResponse({ ok: true }, null), false);
});

test('playback ID generator uses millisecond base and stays increasing', () => {
  const values = [100, 100, 99, 101];
  const ids = createPlaybackIdGenerator(() => values.shift());

  assert.equal(ids.next(), 100000);
  assert.equal(ids.next(), 100001);
  assert.equal(ids.next(), 100002);
  assert.equal(ids.next(), 101000);
  assert.equal(ids.highest(), 101000);
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

test('restore wiring uses the tested restore plan and shared restore promise', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');

  assert.match(html, /MorganRuntime\.buildRestorePlan\(remainingTime\)/);
  assert.match(html, /const appRestoreSingleFlight = MorganRuntime\.createSingleFlight\(\)/);
  assert.match(html, /async function ensureFlightRestored\(\)/);
  assert.match(html, /await ensureFlightRestored\(\)/);
  assert.match(html, /document\.documentElement\.classList\.add\('restoring-flight'\)/);
  assert.match(html, /\.restoring-flight \.info-bar\s*\{\s*visibility:\s*hidden/);
  const domStart = html.indexOf("document.addEventListener('DOMContentLoaded'");
  const domEnd = html.indexOf('// 處理下一步按鈕點擊', domStart);
  assert.doesNotMatch(html.slice(domStart, domEnd), /stopLocalSoundViaPi\(\)/);
  const restoreStart = html.indexOf('async function restoreFlightState()');
  const restoreEnd = html.indexOf('async function saveSleepRecord', restoreStart);
  const restoreSource = html.slice(restoreStart, restoreEnd);
  assert.equal((restoreSource.match(/stopLocalSoundViaPi\(\{/g) || []).length, 1);
  const stopIndex = restoreSource.indexOf("await stopLocalSoundViaPi({ scope: 'all', retries: 2 })");
  const switchIndex = restoreSource.indexOf('switchToPhase(restorePlan.phase');
  assert.ok(stopIndex >= 0);
  assert.ok(switchIndex > stopIndex);
  assert.match(restoreSource, /audioStopFailed:\s*true/);
});

test('Pi audio wiring sends background requests and exposes volume control', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');
  const playStart = html.indexOf('async function playLocalSoundViaPi(');
  const playEnd = html.indexOf('async function stopLocalSoundViaPi()', playStart);
  const playSource = html.slice(playStart, playEnd);

  assert.match(playSource, /const isBackground = options\.background === true/);
  assert.match(playSource, /playback_id:\s*playbackId/);
  assert.match(html, /async function setLocalBackgroundVolume\(volume,\s*fadeMs\s*=\s*0\)/);
  assert.match(html, /TTS_LOCAL_BASE \+ '\/audio\/volume'/);
  assert.match(html, /playLocalSoundViaPi\(localPath,\s*60,\s*0\.6,\s*\{\s*background:\s*true\s*\}\)/);
  assert.match(html, /playLocalSoundViaPi\(selectedMusic,\s*null,\s*0\.6,\s*\{\s*background:\s*true\s*\}\)/);
  const stopStart = html.indexOf('async function stopLocalSoundViaPi({');
  const stopEnd = html.indexOf('// 頁面重整／關閉', stopStart);
  const stopSource = html.slice(stopStart, stopEnd);
  assert.match(stopSource, /async function stopLocalSoundViaPi\(\{\s*throughId/);
  assert.match(stopSource, /through_id:\s*effectiveThroughId/);
  assert.match(stopSource, /scope:\s*scope/);
  assert.match(stopSource, /scope\s*=\s*'all'/);
  assert.match(stopSource, /retries/);
  assert.match(stopSource, /await response\.json\(\)\.catch/);
  assert.match(stopSource, /MorganRuntime\.isSuccessfulAudioStopResponse\(response,\s*data\)/);
  assert.doesNotMatch(stopSource, /phase7MusicGeneration\.cancel/);
  assert.match(html, /stopLocalSoundViaPi\(\{\s*scope:\s*'all',\s*keepalive:\s*true\s*\}\)/);
  assert.doesNotMatch(html, /addEventListener\('beforeunload'.*stopLocalSoundViaPi/);
  assert.doesNotMatch(
    html,
    /stopLocalSoundViaPi\([^;]*\);?\s*window\._(?:phase7WakeupMusic|mealMusicViaPi|piAudioPlaying)\s*=/,
  );
});

test('Phase 7 wakeup wiring uses single-flight and explicit Pi references', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');
  const start = html.indexOf('async function playWakeupMusicForPhase7()');
  const end = html.indexOf('// 記錄深夜服務事件', start);
  const source = html.slice(start, end);

  assert.match(html, /const phase7MusicSingleFlight = MorganRuntime\.createSingleFlight\(\)/);
  assert.match(html, /const phase7MusicGeneration = MorganRuntime\.createGenerationGuard\(\)/);
  assert.match(source, /phase7MusicSingleFlight\.run/);
  assert.match(source, /try\s*\{/);
  assert.match(source, /catch\s*\(/);
  assert.match(source, /finally\s*\{/);
  assert.match(source, /phase7MusicGeneration\.isCurrent\(startToken\)/);
  assert.match(source, /playbackId/);
  assert.match(source, /stopLocalSoundViaPi\(\{\s*throughId:\s*playbackId,\s*scope:\s*'background'/);
  assert.match(source, /let ownedRef = startingRef/);
  assert.match(source, /let startCompleted = false/);
  assert.match(source, /if \(!startCompleted && window\._phase7WakeupMusic === ownedRef\)/);
  assert.match(source, /source:\s*'pi'[\s\S]*paused:\s*false[\s\S]*playbackId/);
  assert.doesNotMatch(source, /pause\(\)\s*\{\s*\}/);
});

test('Phase 7 browser volume applies zero-duration changes immediately', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');
  const start = html.indexOf('async function setPhase7MusicVolume(');
  const end = html.indexOf('// Phase 7／緊急降落', start);
  const source = html.slice(start, end);

  assert.match(source, /if \(duration <= 0\) \{\s*music\.volume = clamped;\s*return;\s*\}/);
});

test('landing wiring fades and explicitly stops background audio before voice B', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');
  const landingVideoStart = html.indexOf('async function playLandingVideoAndShowImage(');
  const landingVideoEnd = html.indexOf('// 驗證尺寸', landingVideoStart);
  const landingVideoSource = html.slice(landingVideoStart, landingVideoEnd);

  assert.match(landingVideoSource, /setPhase7MusicVolume\(0,\s*8000\)/);

  const landingFlowStart = html.indexOf('await playLandingVideoAndShowImage(');
  const voiceBStart = html.indexOf('// 步驟 6: 等情緒表', landingFlowStart);
  const landingFlowSource = html.slice(landingFlowStart, voiceBStart);
  assert.match(landingFlowSource, /await stopLocalSoundViaPi\(\{[\s\S]*scope:\s*'background'[\s\S]*retries:\s*2/);
  assert.match(landingFlowSource, /window\._landingAudioStopFailed = !stoppedRemainingMusic/);
  assert.match(landingFlowSource, /setTimeout\(async \(\) =>/);

  const voiceBFlowStart = html.indexOf('// 顯示文字B並播放語音B', voiceBStart);
  const voiceBFlowEnd = html.indexOf('// 步驟 8: 保存到 Firebase', voiceBFlowStart);
  const voiceBSource = html.slice(voiceBFlowStart, voiceBFlowEnd);
  assert.match(voiceBSource, /if \(window\._landingAudioStopFailed\)/);
});

test('stop callers use all scope only for lifecycle resets', () => {
  const html = readFileSync(new URL('../pi.html', import.meta.url), 'utf8');
  const conditionalCalls = [...html.matchAll(/stopLocalSoundViaPi\(\{([\s\S]*?)\}\)/g)]
    .map((match) => match[1])
    .filter((body) => /\bthroughId\s*:/.test(body));
  assert.ok(conditionalCalls.length > 0);
  for (const body of conditionalCalls) {
    assert.match(body, /scope:\s*'background'/);
  }

  const resetStart = html.indexOf('function resetFlightState()');
  const resetEnd = html.indexOf('// 設置旋鈕事件監聽器', resetStart);
  const resetSource = html.slice(resetStart, resetEnd);
  assert.match(resetSource, /stopLocalSoundViaPi\(\{\s*scope:\s*'all'/);

  const mealStart = html.indexOf('async function triggerMidnightService()');
  const mealEnd = html.indexOf('async function generateMidnightServiceImage()', mealStart);
  const mealSource = html.slice(mealStart, mealEnd);
  assert.match(mealSource, /throughId:\s*window\._mealMusicPlaybackId,\s*scope:\s*'background'/);
});
