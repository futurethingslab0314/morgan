(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MorganRuntime = factory();
  }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var phases = {
    country: 0,
    timer: 1,
    angle: 2,
    destination: 3,
    ready_to_fly: 4
  };

  function phaseForState(state) {
    return Object.prototype.hasOwnProperty.call(phases, state)
      ? phases[state]
      : null;
  }

  function previousPreparationPhase(phase) {
    return Number.isInteger(phase) && phase >= 1 && phase <= 4
      ? phase - 1
      : null;
  }

  function preparationBackTarget(phase, state) {
    var stateForPhase = [
      'country',
      'timer',
      'angle',
      'destination',
      'ready_to_fly'
    ];

    if (!Number.isInteger(phase)
      || phase < 1
      || phase > 4
      || stateForPhase[phase] !== state) {
      return null;
    }

    var targetPhase = previousPreparationPhase(phase);
    if (phase === 4) {
      targetPhase = previousPreparationPhase(targetPhase);
    }

    return targetPhase === null
      ? null
      : { phase: targetPhase, state: stateForPhase[targetPhase] };
  }

  function isPreparationTransition(currentPhase, targetPhase) {
    var safeTargets = {
      0: [0, 1],
      1: [0, 1, 2],
      2: [1, 2, 3, 4],
      3: [2, 3, 4],
      4: [2, 3, 4]
    };

    return Number.isInteger(currentPhase)
      && Number.isInteger(targetPhase)
      && Object.prototype.hasOwnProperty.call(safeTargets, currentPhase)
      && safeTargets[currentPhase].indexOf(targetPhase) !== -1;
  }

  function planPreparationStateTransition(currentPhase, state) {
    var desiredPhase = phaseForState(state);
    if (desiredPhase === null) {
      return null;
    }

    if (Number.isInteger(currentPhase) && currentPhase >= 0 && currentPhase <= 4) {
      if (currentPhase !== desiredPhase
        && !isPreparationTransition(currentPhase, desiredPhase)) {
        return null;
      }

      return {
        state: state,
        phase: desiredPhase,
        maxReachedPhase: desiredPhase
      };
    }

    if (Number.isInteger(currentPhase) && currentPhase >= 5 && currentPhase <= 7) {
      return {
        state: state,
        phase: currentPhase,
        maxReachedPhase: null
      };
    }

    return null;
  }

  var preparationCleanupPolicies = {
    0: Object.freeze({
      clearDownstream: false,
      preservesAngle: false,
      clearAngle: false,
      clearTimer: true
    }),
    1: Object.freeze({
      clearDownstream: false,
      preservesAngle: false,
      clearAngle: true,
      clearTimer: false
    }),
    2: Object.freeze({
      clearDownstream: true,
      preservesAngle: true,
      clearAngle: false,
      clearTimer: false
    })
  };

  function preparationReturnCleanup(targetPhase) {
    return Object.prototype.hasOwnProperty.call(preparationCleanupPolicies, targetPhase)
      ? preparationCleanupPolicies[targetPhase]
      : null;
  }

  function restoreTarget(remainingMs) {
    return remainingMs > 300000 ? 5 : 6;
  }

  function buildRestorePlan(remainingMs) {
    if (remainingMs > 300000) {
      return {
        phase: 5,
        descentDelayMs: remainingMs - 300000,
        overdue: false
      };
    }

    return {
      phase: 6,
      descentDelayMs: null,
      overdue: remainingMs <= 0
    };
  }

  function createSingleFlight() {
    var inFlight = null;

    return {
      run: function (factory) {
        if (inFlight) {
          return inFlight;
        }

        try {
          inFlight = Promise.resolve(factory());
        } catch (error) {
          inFlight = Promise.reject(error);
        }

        var current = inFlight;
        inFlight = current.finally(function () {
          if (inFlight === wrapped) {
            inFlight = null;
          }
        });
        var wrapped = inFlight;
        return wrapped;
      }
    };
  }

  function createGenerationGuard() {
    var generation = 0;

    return {
      next: function () {
        generation += 1;
        return generation;
      },
      cancel: function () {
        generation += 1;
      },
      isCurrent: function (token) {
        return token === generation;
      }
    };
  }

  function isSuccessfulAudioStopResponse(response, data) {
    return Boolean(response && response.ok && data && data.success === true);
  }

  function createPlaybackIdGenerator(now) {
    var getNow = now || Date.now;
    var lastTimestamp = null;
    var sequence = 0;
    var highest = 0;

    return {
      next: function () {
        var timestamp = Number(getNow());
        if (!Number.isFinite(timestamp)) {
          timestamp = Date.now();
        }
        timestamp = Math.floor(timestamp);
        if (timestamp === lastTimestamp) {
          sequence += 1;
        } else {
          lastTimestamp = timestamp;
          sequence = 0;
        }
        var candidate = timestamp * 1000 + sequence;
        if (candidate <= highest) {
          candidate = highest + 1;
        }
        highest = candidate;
        return candidate;
      },
      highest: function () {
        return highest;
      }
    };
  }

  function canTriggerMeal(ctx) {
    var readyAt = ctx.readyAt === undefined ? 0 : ctx.readyAt;

    return ctx.phase === 5
      && !ctx.triggered
      && !ctx.active
      && Boolean(ctx.sleepStartTime)
      && ctx.oldPosition !== null
      && ctx.oldPosition !== undefined
      && ctx.oldPosition !== ctx.newPosition
      && ctx.now >= readyAt;
  }

  function createTimerRegistry(clearTimer) {
    var timers = new Map();
    var clear = clearTimer === undefined ? clearTimeout : clearTimer;

    return {
      set: function (key, id) {
        if (timers.has(key)) {
          clear(timers.get(key));
        }
        timers.set(key, id);
      },
      clear: function (key) {
        if (!timers.has(key)) {
          return;
        }
        clear(timers.get(key));
        timers.delete(key);
      },
      clearAll: function () {
        timers.forEach(function (id) {
          clear(id);
        });
        timers.clear();
      },
      has: function (key) {
        return timers.has(key);
      }
    };
  }

  function createLogger(options) {
    options = options || {};
    var debugEnabled = Boolean(options.debug);
    var sink = options.sink || console;
    var onceKeys = new Set();

    function forward(level, args) {
      if (typeof sink[level] === 'function') {
        sink[level].apply(sink, args);
      }
    }

    return {
      error: function () {
        forward('error', arguments);
      },
      warn: function () {
        forward('warn', arguments);
      },
      info: function () {
        forward('info', arguments);
      },
      debug: function () {
        if (debugEnabled) {
          forward('debug', arguments);
        }
      },
      once: function (key) {
        if (onceKeys.has(key)) {
          return;
        }
        onceKeys.add(key);
        forward('info', Array.prototype.slice.call(arguments, 1));
      },
      resetOnce: function (key) {
        if (arguments.length === 0) {
          onceKeys.clear();
        } else {
          onceKeys.delete(key);
        }
      }
    };
  }

  function isDebugEnabled(locationLike, storageLike) {
    var search = locationLike && typeof locationLike.search === 'string'
      ? locationLike.search
      : '';

    if (new URLSearchParams(search).get('debug') === '1') {
      return true;
    }

    try {
      return Boolean(storageLike)
        && typeof storageLike.getItem === 'function'
        && storageLike.getItem('morganDebug') === '1';
    } catch (error) {
      return false;
    }
  }

  return {
    phaseForState: phaseForState,
    previousPreparationPhase: previousPreparationPhase,
    preparationBackTarget: preparationBackTarget,
    preparationReturnCleanup: preparationReturnCleanup,
    isPreparationTransition: isPreparationTransition,
    planPreparationStateTransition: planPreparationStateTransition,
    restoreTarget: restoreTarget,
    buildRestorePlan: buildRestorePlan,
    createSingleFlight: createSingleFlight,
    createGenerationGuard: createGenerationGuard,
    isSuccessfulAudioStopResponse: isSuccessfulAudioStopResponse,
    createPlaybackIdGenerator: createPlaybackIdGenerator,
    canTriggerMeal: canTriggerMeal,
    createTimerRegistry: createTimerRegistry,
    createLogger: createLogger,
    isDebugEnabled: isDebugEnabled
  };
}));
