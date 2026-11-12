const Monitoring = require("../models/Monitoring");
const Fault = require("../models/Fault");

const ICMP_FAULTS = [
  "Connectivity Fault",
  "Timeout Fault",
  "High Packet Loss",
  "High Latency",
];

const TCP_FAULTS = [
  "Service Unavailable",
  "Service Timeout",
  "Network Unreachable",
];

/**
 * Determine fault severity based on fault_type string.
 */
const getSeverity = (faultType) => {
  if (faultType === "Connectivity Fault" || faultType === "Service Unavailable") return "CRITICAL";
  if (faultType === "Timeout Fault" || faultType === "Service Timeout") return "HIGH";
  if (faultType === "High Packet Loss") return "MEDIUM";
  if (faultType === "High Latency" || faultType === "Network Unreachable") return "LOW";
  return "LOW";
};

/**
 * Handle ICMP fault upsert and recovery.
 */
const handleIcmpFault = async (host, name, faultValue, statusValue) => {
  if (faultValue && faultValue !== "No Fault") {
    const existing = await Fault.findOne({ host, fault_type: faultValue, status: "active" });
    if (!existing) {
      await Fault.create({
        host,
        name,
        fault_type: faultValue,
        description: `${faultValue} detected on ${host}`,
        severity: getSeverity(faultValue),
        status: "active",
      });
    }
  } else if (faultValue === "No Fault" && statusValue === "UP") {
    // Only recover active ICMP faults, preserving independent TCP faults
    await Fault.updateMany(
      { host, status: "active", fault_type: { $in: ICMP_FAULTS } },
      { $set: { status: "recovered", recovery_time: new Date() } }
    );
  }
};

/**
 * Handle TCP fault upsert and recovery.
 */
const handleTcpFault = async (host, name, tcpFaultValue, tcpStatusValue) => {
  if (tcpFaultValue && tcpFaultValue !== "No Fault") {
    const existing = await Fault.findOne({ host, fault_type: tcpFaultValue, status: "active" });
    if (!existing) {
      await Fault.create({
        host,
        name,
        fault_type: tcpFaultValue,
        description: `${tcpFaultValue} detected on ${host}`,
        severity: getSeverity(tcpFaultValue),
        status: "active",
      });
    }
  } else if ((tcpFaultValue === "No Fault" || !tcpFaultValue) && tcpStatusValue === "OPEN") {
    // Only recover active TCP faults, preserving independent ICMP faults
    await Fault.updateMany(
      { host, status: "active", fault_type: { $in: TCP_FAULTS } },
      { $set: { status: "recovered", recovery_time: new Date() } }
    );
  }
};

/**
 * POST /api/monitoring
 * Receive monitoring data from Python engine, save it, handle fault logic.
 */
const createMonitoring = async (req, res, next) => {
  try {
    const {
      name,
      host,
      status,
      latency,
      packet_loss,
      received,
      tcp_status,
      tcp_port,
      fault,
      tcp_fault,
      timestamp,
    } = req.body;

    const record = await Monitoring.create({
      name,
      host,
      status,
      latency: latency !== undefined ? latency : null,
      packet_loss: packet_loss !== undefined ? packet_loss : null,
      received: received !== undefined ? received : 0,
      tcp_status: tcp_status || null,
      tcp_port,
      fault: fault || "No Fault",
      tcp_fault: tcp_fault || "No Fault",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    // Handle ICMP and TCP faults independently
    await handleIcmpFault(host, name, record.fault, status);
    await handleTcpFault(host, name, record.tcp_fault, tcp_status);

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/monitoring
 * Query params: ?limit=100 (default 100), ?host=<host>
 */
const getMonitoring = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const filter = {};
    if (req.query.host) {
      filter.host = req.query.host;
    }

    const records = await Monitoring.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/monitoring/latest
 * Most recent record per host (all devices latest status).
 */
const getLatestMonitoring = async (req, res, next) => {
  try {
    const latest = await Monitoring.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$host",
          doc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { host: 1 } },
    ]);

    res.json({ success: true, count: latest.length, data: latest });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/monitoring/:host
 * History for a specific host (last 200 records).
 */
const getMonitoringByHost = async (req, res, next) => {
  try {
    const { host } = req.params;
    const records = await Monitoring.find({ host })
      .sort({ timestamp: -1 })
      .limit(200);

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/monitoring/:host/analytics
 */
const getHostAnalytics = async (req, res, next) => {
  try {
    const { host } = req.params;

    const records = await Monitoring.find({ host });

    if (records.length === 0) {
      return res.json({
        success: true,
        data: {
          host,
          total_checks: 0,
          up_count: 0,
          down_count: 0,
          availability_percent: 0,
          avg_latency: null,
          avg_packet_loss: null,
          fault_counts: {},
        },
      });
    }

    const total_checks = records.length;
    const up_count = records.filter((r) => r.status === "UP").length;
    const down_count = records.filter((r) => r.status !== "UP").length;
    const availability_percent = ((up_count / total_checks) * 100).toFixed(2);

    const latencies = records
      .filter((r) => r.latency !== null && r.latency !== undefined)
      .map((r) => r.latency);
    const avg_latency = latencies.length > 0
      ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
      : null;

    const losses = records
      .filter((r) => r.packet_loss !== null && r.packet_loss !== undefined)
      .map((r) => r.packet_loss);
    const avg_packet_loss = losses.length > 0
      ? (losses.reduce((a, b) => a + b, 0) / losses.length).toFixed(2)
      : null;

    const fault_counts = {};
    for (const r of records) {
      if (r.fault && r.fault !== "No Fault") {
        fault_counts[r.fault] = (fault_counts[r.fault] || 0) + 1;
      }
      if (r.tcp_fault && r.tcp_fault !== "No Fault") {
        fault_counts[r.tcp_fault] = (fault_counts[r.tcp_fault] || 0) + 1;
      }
    }

    res.json({
      success: true,
      data: {
        host,
        total_checks,
        up_count,
        down_count,
        availability_percent: parseFloat(availability_percent),
        avg_latency: avg_latency !== null ? parseFloat(avg_latency) : null,
        avg_packet_loss: avg_packet_loss !== null ? parseFloat(avg_packet_loss) : null,
        fault_counts,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMonitoring,
  getMonitoring,
  getLatestMonitoring,
  getMonitoringByHost,
  getHostAnalytics,
  ICMP_FAULTS,
  TCP_FAULTS,
  getSeverity,
};

