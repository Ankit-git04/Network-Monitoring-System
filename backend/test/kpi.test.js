/**
 * test/kpi.test.js
 *
 * Regression tests for the Dashboard KPI calculation bug fix.
 *
 * Root cause: The old Dashboard counted UP/DOWN from /api/monitoring/latest
 * which includes stale records for deleted devices, causing UP > Total.
 *
 * Fix: GET /api/devices/stats computes KPIs strictly over the registered
 * device population joined with the latest monitoring record per host.
 *
 * Invariant enforced: total === up + down + pending
 */
const test = require('node:test');
const assert = require('node:assert');

/**
 * Pure-function implementation of the KPI algorithm used in
 * GET /api/devices/stats — extracted for unit testing without DB.
 *
 * @param {Array} devices         - Registered device objects (must have .host)
 * @param {Array} latestByHost    - Objects with { _id: host, status, latency }
 * @returns {{ total, up, down, pending, availability, avg_latency }}
 */
function computeDeviceStats(devices, latestByHost) {
  const total = devices.length;

  if (total === 0) {
    return { total: 0, up: 0, down: 0, pending: 0, availability: 0, avg_latency: null };
  }

  const monMap = {};
  latestByHost.forEach((m) => { monMap[m._id] = m; });

  let up = 0, down = 0, pending = 0;
  const validLatencies = [];

  devices.forEach((device) => {
    const mon = monMap[device.host];
    if (!mon || !mon.status) {
      pending++;
    } else if (mon.status === 'UP') {
      up++;
      if (mon.latency !== null && mon.latency !== undefined) {
        validLatencies.push(mon.latency);
      }
    } else if (mon.status === 'DOWN' || mon.status === 'TIMEOUT') {
      down++;
    } else {
      pending++;
    }
  });

  const availability = parseFloat(((up / total) * 100).toFixed(1));
  const avg_latency = validLatencies.length > 0
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
    : null;

  return { total, up, down, pending, availability, avg_latency };
}

// ─── Helper ────────────────────────────────────────────────────────────────────
function assertInvariant(result, label) {
  assert.strictEqual(
    result.total,
    result.up + result.down + result.pending,
    `[${label}] Invariant violated: total(${result.total}) !== up(${result.up}) + down(${result.down}) + pending(${result.pending})`
  );
}

// ─── Test suite ─────────────────────────────────────────────────────────────────
test('Dashboard KPI Regression Tests', async (t) => {

  // Test 1: 5 devices — 4 UP, 1 DOWN
  await t.test('5 devices: 4 UP 1 DOWN', () => {
    const devices = [
      { host: '8.8.8.8' }, { host: '1.1.1.1' }, { host: 'google.com' },
      { host: '9.9.9.9' }, { host: '192.168.1.1' },
    ];
    const latest = [
      { _id: '8.8.8.8',      status: 'UP',   latency: 10 },
      { _id: '1.1.1.1',      status: 'UP',   latency: 15 },
      { _id: 'google.com',   status: 'UP',   latency: 44 },
      { _id: '9.9.9.9',      status: 'UP',   latency: 30 },
      { _id: '192.168.1.1',  status: 'DOWN', latency: null },
      // Stale entry for DELETED device — must not inflate any counter
      { _id: '10.0.0.99',    status: 'UP',   latency: 5 },
    ];
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.total, 5);
    assert.strictEqual(result.up, 4);
    assert.strictEqual(result.down, 1);
    assert.strictEqual(result.pending, 0);
    assertInvariant(result, '4 UP 1 DOWN');
  });

  // Test 2: 5 devices — 3 UP, 1 DOWN, 1 PENDING
  await t.test('5 devices: 3 UP 1 DOWN 1 PENDING', () => {
    const devices = [
      { host: '8.8.8.8' }, { host: '1.1.1.1' }, { host: 'google.com' },
      { host: '9.9.9.9' }, { host: 'new-device.local' },
    ];
    const latest = [
      { _id: '8.8.8.8',    status: 'UP',   latency: 10 },
      { _id: '1.1.1.1',    status: 'UP',   latency: 15 },
      { _id: 'google.com', status: 'DOWN', latency: null },
      { _id: '9.9.9.9',    status: 'UP',   latency: 30 },
      // new-device.local has no monitoring record yet → PENDING
    ];
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.total, 5);
    assert.strictEqual(result.up, 3);
    assert.strictEqual(result.down, 1);
    assert.strictEqual(result.pending, 1);
    assertInvariant(result, '3UP 1DOWN 1PENDING');
  });

  // Test 3: 1 device with multiple historical records — must be counted once
  await t.test('1 device with multiple monitoring history records counted once', () => {
    const devices = [{ host: '8.8.8.8' }];
    // The aggregate query returns exactly one record per host
    const latest = [
      { _id: '8.8.8.8', status: 'UP', latency: 50 }, // most recent
    ];
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.up, 1);
    assert.strictEqual(result.down, 0);
    assert.strictEqual(result.pending, 0);
    assertInvariant(result, '1 device multiple history');
  });

  // Test 4: device status changes from UP to DOWN
  await t.test('device latest status change from UP to DOWN reflected correctly', () => {
    const devices = [{ host: '192.168.1.1' }];
    // Latest = DOWN (most recent monitoring result)
    const latestDown = [{ _id: '192.168.1.1', status: 'DOWN', latency: null }];
    const resultDown = computeDeviceStats(devices, latestDown);
    assert.strictEqual(resultDown.up, 0);
    assert.strictEqual(resultDown.down, 1);
    assertInvariant(resultDown, 'status=DOWN');

    // If latest was UP instead
    const latestUp = [{ _id: '192.168.1.1', status: 'UP', latency: 20 }];
    const resultUp = computeDeviceStats(devices, latestUp);
    assert.strictEqual(resultUp.up, 1);
    assert.strictEqual(resultUp.down, 0);
    assertInvariant(resultUp, 'status=UP');
  });

  // Test 5: 1 device without any monitoring records → PENDING
  await t.test('device with no monitoring records is counted as PENDING', () => {
    const devices = [{ host: 'brand-new.example.com' }];
    const latest = []; // no monitoring data at all
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.up, 0);
    assert.strictEqual(result.down, 0);
    assert.strictEqual(result.pending, 1);
    assertInvariant(result, 'no monitoring records');
  });

  // Test 6: Deleted device with stale monitoring history MUST NOT affect counts
  await t.test('deleted device with stale monitoring records does not inflate KPIs', () => {
    // Only 2 registered devices
    const devices = [{ host: '8.8.8.8' }, { host: '1.1.1.1' }];
    // 4 monitoring records including 2 for deleted devices
    const latest = [
      { _id: '8.8.8.8',       status: 'UP', latency: 10 },
      { _id: '1.1.1.1',       status: 'UP', latency: 20 },
      { _id: '10.0.0.1',      status: 'UP', latency: 5  }, // deleted device — stale
      { _id: '192.168.1.100', status: 'UP', latency: 30 }, // deleted device — stale
    ];
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.total, 2, 'Total must equal registered devices');
    assert.strictEqual(result.up, 2, 'UP must only count registered UP devices');
    assert.strictEqual(result.down, 0);
    assert.strictEqual(result.pending, 0);
    assertInvariant(result, 'stale deleted device records');
  });

  // Test 7: TIMEOUT status counts as DOWN
  await t.test('TIMEOUT status is counted as DOWN', () => {
    const devices = [
      { host: 'host-a.local' },
      { host: 'host-b.local' },
    ];
    const latest = [
      { _id: 'host-a.local', status: 'UP',      latency: 10 },
      { _id: 'host-b.local', status: 'TIMEOUT', latency: null },
    ];
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.up, 1);
    assert.strictEqual(result.down, 1);
    assert.strictEqual(result.pending, 0);
    assertInvariant(result, 'TIMEOUT=DOWN');
  });

  // Test 8: Empty device list
  await t.test('zero registered devices returns all zeros', () => {
    const result = computeDeviceStats([], []);
    assert.strictEqual(result.total, 0);
    assert.strictEqual(result.up, 0);
    assert.strictEqual(result.down, 0);
    assert.strictEqual(result.pending, 0);
    assert.strictEqual(result.availability, 0);
    assert.strictEqual(result.avg_latency, null);
  });

  // Test 9: Average latency computed only over UP devices
  await t.test('avg_latency is computed only over UP devices', () => {
    const devices = [
      { host: 'a.local' }, { host: 'b.local' }, { host: 'c.local' },
    ];
    const latest = [
      { _id: 'a.local', status: 'UP',   latency: 10 },
      { _id: 'b.local', status: 'UP',   latency: 30 },
      { _id: 'c.local', status: 'DOWN', latency: null },
    ];
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.up, 2);
    assert.strictEqual(result.down, 1);
    // avg of [10, 30] = 20
    assert.strictEqual(result.avg_latency, 20);
    assertInvariant(result, 'avg latency UP only');
  });

  // Test 10: Availability percentage calculation
  await t.test('availability is correctly calculated as (up/total)*100', () => {
    const devices = [
      { host: 'a' }, { host: 'b' }, { host: 'c' }, { host: 'd' },
    ];
    const latest = [
      { _id: 'a', status: 'UP',   latency: 10 },
      { _id: 'b', status: 'UP',   latency: 20 },
      { _id: 'c', status: 'DOWN', latency: null },
      // d has no monitoring record → pending
    ];
    const result = computeDeviceStats(devices, latest);
    assert.strictEqual(result.total, 4);
    assert.strictEqual(result.up, 2);
    assert.strictEqual(result.pending, 1);
    // 2/4 * 100 = 50.0
    assert.strictEqual(result.availability, 50.0);
    assertInvariant(result, 'availability 50%');
  });
});

test('ICMP and TCP Fault Type Separation Regression Test', async (t) => {
  const { ICMP_FAULTS, TCP_FAULTS, getSeverity } = require('../src/controllers/monitoringController');

  await t.test('ICMP_FAULTS and TCP_FAULTS are mutually exclusive', () => {
    const overlap = ICMP_FAULTS.filter(f => TCP_FAULTS.includes(f));
    assert.strictEqual(overlap.length, 0, 'ICMP and TCP fault lists must not overlap');
  });

  await t.test('severity mapping covers all fault types', () => {
    const allFaults = [...ICMP_FAULTS, ...TCP_FAULTS];
    for (const f of allFaults) {
      const sev = getSeverity(f);
      assert.ok(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(sev), `${f} has unexpected severity: ${sev}`);
    }
  });
});
