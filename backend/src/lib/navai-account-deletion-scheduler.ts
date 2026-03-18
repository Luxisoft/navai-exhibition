import {
  deactivateExpiredNavaiPanelAccessAccounts,
} from "./navai-panel-access-sqlite";
import {
  deactivateExpiredNavaiPanelUserAccounts,
} from "./navai-panel-workspace-sqlite";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

let schedulerStarted = false;
let nextMidnightTimer: NodeJS.Timeout | null = null;
let dailySweepInterval: NodeJS.Timeout | null = null;

function getDelayUntilNextMidnight() {
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(1_000, nextMidnight.getTime() - Date.now());
}

async function runDeletionDeactivationSweep() {
  const now = new Date();
  try {
    const [accessCount, profileCount] = await Promise.all([
      deactivateExpiredNavaiPanelAccessAccounts(now),
      deactivateExpiredNavaiPanelUserAccounts(now),
    ]);

    if (accessCount > 0 || profileCount > 0) {
      console.log(
        `[navai] Account deactivation sweep completed. access=${accessCount} profiles=${profileCount}`,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown account deactivation sweep error.";
    console.error(`[navai] Account deactivation sweep failed: ${message}`);
  }
}

export function startNavaiAccountDeletionScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  void runDeletionDeactivationSweep();

  nextMidnightTimer = setTimeout(() => {
    void runDeletionDeactivationSweep();
    dailySweepInterval = setInterval(() => {
      void runDeletionDeactivationSweep();
    }, DAY_IN_MS);
  }, getDelayUntilNextMidnight());
}

export function stopNavaiAccountDeletionScheduler() {
  if (nextMidnightTimer) {
    clearTimeout(nextMidnightTimer);
    nextMidnightTimer = null;
  }

  if (dailySweepInterval) {
    clearInterval(dailySweepInterval);
    dailySweepInterval = null;
  }

  schedulerStarted = false;
}
