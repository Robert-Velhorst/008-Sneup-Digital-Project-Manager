const scheduler = require('node-schedule');

describe('installed scheduler registry treats every job name as own data', () => {
  const names = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf'];
  const registryPrototype = Object.getPrototypeOf(scheduler.scheduledJobs);
  let owned;

  beforeEach(() => { owned = []; });
  afterEach(() => {
    for (const job of owned) job.cancel();
  });

  const schedule = (name, callback) => {
    const job = scheduler.scheduleJob(name, new Date(Date.now() + 300000), callback);
    if (job) owned.push(job);
    return job;
  };

  test.each(names)('%s is enumerable own job data without changing the registry prototype', name => {
    const callback = jest.fn();
    const job = schedule(name, callback);
    expect(job).toBeInstanceOf(scheduler.Job);
    expect(Object.getPrototypeOf(scheduler.scheduledJobs)).toBe(registryPrototype);
    expect(Object.hasOwn(scheduler.scheduledJobs, name)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(scheduler.scheduledJobs, name)).toEqual({
      value: job, enumerable: true, configurable: true, writable: true
    });
    expect(Object.keys(scheduler.scheduledJobs)).toContain(name);
    expect(scheduler.scheduledJobs[name]).toBe(job);
    expect(callback).not.toHaveBeenCalled();
  });

  test.each(names)('%s can be rescheduled by the original public API', name => {
    const callback = jest.fn();
    const job = schedule(name, callback);
    const result = scheduler.rescheduleJob(name, new Date(Date.now() + 600000));
    expect(result).toBe(job);
    expect(Object.getPrototypeOf(scheduler.scheduledJobs)).toBe(registryPrototype);
    expect(Object.hasOwn(scheduler.scheduledJobs, name)).toBe(true);
    expect(scheduler.scheduledJobs[name]).toBe(job);
    expect(job.pendingInvocations.length).toBe(1);
    expect(callback).not.toHaveBeenCalled();
  });

  test.each(names)('%s can be cancelled without deleting inherited properties', name => {
    const callback = jest.fn();
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(registryPrototype, name);
    const job = schedule(name, callback);
    expect(scheduler.cancelJob(name)).toBe(true);
    expect(job.pendingInvocations.length).toBe(0);
    expect(Object.hasOwn(scheduler.scheduledJobs, name)).toBe(false);
    expect(Object.getPrototypeOf(scheduler.scheduledJobs)).toBe(registryPrototype);
    expect(Object.getOwnPropertyDescriptor(registryPrototype, name)).toEqual(prototypeDescriptor);
    expect(callback).not.toHaveBeenCalled();
  });
});
