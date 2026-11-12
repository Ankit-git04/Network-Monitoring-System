const test = require("node:test");
const assert = require("node:assert");
const validateMonitoring = require("../src/middleware/validateMonitoring");
const { getSeverity, ICMP_FAULTS, TCP_FAULTS } = require("../src/controllers/monitoringController");

test("Backend Validation Middleware Tests", async (t) => {
  await t.test("passes validation with valid host and status", () => {
    const req = {
      body: {
        host: "8.8.8.8",
        status: "UP",
        latency: 12,
        packet_loss: 0,
      },
    };
    let nextCalled = false;
    const res = {};
    const next = () => {
      nextCalled = true;
    };

    validateMonitoring(req, res, next);
    assert.strictEqual(nextCalled, true, "next() should be called on valid payload");
  });

  await t.test("rejects request with missing host", () => {
    const req = { body: { status: "UP" } };
    let statusCode = null;
    let jsonResponse = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
      },
    };
    const next = () => {};

    validateMonitoring(req, res, next);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonResponse.success, false);
    assert.ok(jsonResponse.errors.some((e) => e.includes("host is required")));
  });

  await t.test("rejects request with invalid status value", () => {
    const req = { body: { host: "1.1.1.1", status: "UNKNOWN_STATUS" } };
    let statusCode = null;
    let jsonResponse = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
      },
    };
    const next = () => {};

    validateMonitoring(req, res, next);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonResponse.success, false);
    assert.ok(jsonResponse.errors.some((e) => e.includes("status is required and must be one of")));
  });

  await t.test("accepts valid statuses: UP, DOWN, TIMEOUT", () => {
    for (const status of ["UP", "DOWN", "TIMEOUT"]) {
      const req = { body: { host: "10.0.0.1", status } };
      let called = false;
      validateMonitoring(req, {}, () => {
        called = true;
      });
      assert.strictEqual(called, true, `Should accept status: ${status}`);
    }
  });
});

test("Backend Severity Classification Tests", async () => {
  assert.strictEqual(getSeverity("Connectivity Fault"), "CRITICAL");
  assert.strictEqual(getSeverity("Service Unavailable"), "CRITICAL");
  assert.strictEqual(getSeverity("Timeout Fault"), "HIGH");
  assert.strictEqual(getSeverity("Service Timeout"), "HIGH");
  assert.strictEqual(getSeverity("High Packet Loss"), "MEDIUM");
  assert.strictEqual(getSeverity("High Latency"), "LOW");
  assert.strictEqual(getSeverity("Network Unreachable"), "LOW");
  assert.strictEqual(getSeverity("Unknown Fault"), "LOW");
});

test("ICMP and TCP Fault Type Separation Regression Test", async () => {
  // Verify that ICMP faults and TCP faults are disjoint sets
  for (const icmpFault of ICMP_FAULTS) {
    assert.ok(
      !TCP_FAULTS.includes(icmpFault),
      `ICMP fault "${icmpFault}" must not be classified as a TCP fault`
    );
  }
  for (const tcpFault of TCP_FAULTS) {
    assert.ok(
      !ICMP_FAULTS.includes(tcpFault),
      `TCP fault "${tcpFault}" must not be classified as an ICMP fault`
    );
  }
});

test("Express App Route Mounting Tests", async () => {
  const app = require("../src/app");
  assert.ok(app, "App should export Express application");
  assert.strictEqual(typeof app.handle, "function", "App should have handle function");
});

