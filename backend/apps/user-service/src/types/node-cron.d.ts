declare module 'node-cron' {
  export interface ScheduledTask {
    start: () => ScheduledTask;
    stop: () => ScheduledTask;
    destroy?: () => void;
  }

  export interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
    recoverMissedExecutions?: boolean;
    name?: string;
    runOnInit?: boolean;
  }

  export function schedule(
    cronExpression: string,
    func: ((now: Date | 'manual' | 'init') => void) | string,
    options?: ScheduleOptions,
  ): ScheduledTask;

  export function validate(cronExpression: string): boolean;
  export function getTasks(): Map<string, ScheduledTask>;
}

