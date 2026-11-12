import { useState, useEffect } from "react";
import { healthAPI, settingsAPI } from "../services/api";

export function Settings() {
  const [serverHealth, setServerHealth] = useState(null);
  const [latencyThreshold, setLatencyThreshold] = useState(200);
  const [packetLossThreshold, setPacketLossThreshold] = useState(20);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Health check
    healthAPI
      .check()
      .then((res) => setServerHealth(res.data))
      .catch(() => setServerHealth({ status: "offline" }));

    // Fetch persisted settings from MongoDB
    settingsAPI
      .get()
      .then((res) => {
        if (res.data) {
          if (res.data.latency_threshold !== undefined) {
            setLatencyThreshold(res.data.latency_threshold);
          }
          if (res.data.packet_loss_threshold !== undefined) {
            setPacketLossThreshold(res.data.packet_loss_threshold);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote settings:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    setSavedMessage("");
    setErrorMessage("");

    const lat = Number(latencyThreshold);
    const loss = Number(packetLossThreshold);

    if (isNaN(lat) || lat <= 0) {
      setErrorMessage("Latency threshold must be a number greater than 0 ms.");
      return;
    }

    if (isNaN(loss) || loss < 0 || loss > 100) {
      setErrorMessage("Packet loss threshold must be between 0% and 100%.");
      return;
    }

    setSaving(true);
    try {
      const res = await settingsAPI.update({
        latency_threshold: lat,
        packet_loss_threshold: loss,
      });
      if (res.data) {
        setLatencyThreshold(res.data.latency_threshold);
        setPacketLossThreshold(res.data.packet_loss_threshold);
      }
      setSavedMessage("Threshold preferences saved to MongoDB and synchronized with monitoring engine.");
      setTimeout(() => setSavedMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Failed to save settings to server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100">System & Monitoring Settings</h2>
        <p className="text-sm text-gray-400">Configure fault triggers, alert thresholds, and engine parameters</p>
      </div>

      {savedMessage && (
        <div className="bg-green-900/40 border border-green-700 text-green-300 p-3 rounded-xl text-xs">
          âœ” {savedMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 p-3 rounded-xl text-xs">
          âš  {errorMessage}
        </div>
      )}

      {/* Threshold Configuration Form */}
      <div className="bg-navy-800 rounded-xl border border-navy-600 p-6 space-y-5">
        <div className="border-b border-navy-600 pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-gray-100">Fault Detection Thresholds</h3>
            <p className="text-xs text-gray-400 mt-0.5">Persisted in MongoDB; automatically synchronized to Python monitoring engine</p>
          </div>
          {loading && <span className="text-xs text-gray-500">Loading settings...</span>}
        </div>

        <form onSubmit={handleSaveThresholds} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Maximum Acceptable Latency (ms)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={latencyThreshold}
                  onChange={(e) => setLatencyThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-gray-500">ms</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Triggers "High Latency" fault when exceeded (default: 200 ms)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Maximum Acceptable Packet Loss (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={packetLossThreshold}
                  onChange={(e) => setPacketLossThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-gray-500">%</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Triggers "High Packet Loss" fault when exceeded (default: 20%)</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Synchronize Thresholds"}
            </button>
          </div>
        </form>
      </div>

      {/* Network Engine Operational Parameters */}
      <div className="bg-navy-800 rounded-xl border border-navy-600 p-6 space-y-4">
        <div className="border-b border-navy-600 pb-3">
          <h3 className="text-base font-semibold text-gray-100">Monitoring Engine Specs</h3>
          <p className="text-xs text-gray-400 mt-0.5">Parameters operated by the Python ICMP/TCP monitoring engine</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-navy-900/60 p-3.5 rounded-lg border border-navy-700">
            <span className="text-gray-400">Ping Probe Count</span>
            <div className="text-base font-mono font-bold text-gray-200 mt-1">4 packets / cycle</div>
          </div>
          <div className="bg-navy-900/60 p-3.5 rounded-lg border border-navy-700">
            <span className="text-gray-400">ICMP Timeout</span>
            <div className="text-base font-mono font-bold text-gray-200 mt-1">10 seconds</div>
          </div>
          <div className="bg-navy-900/60 p-3.5 rounded-lg border border-navy-700">
            <span className="text-gray-400">TCP Connect Timeout</span>
            <div className="text-base font-mono font-bold text-gray-200 mt-1">3 seconds</div>
          </div>
          <div className="bg-navy-900/60 p-3.5 rounded-lg border border-navy-700">
            <span className="text-gray-400">Monitoring Cycle Interval</span>
            <div className="text-base font-mono font-bold text-gray-200 mt-1">5 seconds</div>
          </div>
          <div className="bg-navy-900/60 p-3.5 rounded-lg border border-navy-700">
            <span className="text-gray-400">Backend Report Target</span>
            <div className="text-base font-mono font-bold text-blue-400 mt-1 truncate">http://localhost:5000</div>
          </div>
          <div className="bg-navy-900/60 p-3.5 rounded-lg border border-navy-700">
            <span className="text-gray-400">History Log</span>
            <div className="text-base font-mono font-bold text-gray-200 mt-1">data/monitoring_history.jsonl</div>
          </div>
        </div>
      </div>

      {/* Backend & Database Infrastructure Info */}
      <div className="bg-navy-800 rounded-xl border border-navy-600 p-6 space-y-4">
        <div className="border-b border-navy-600 pb-3">
          <h3 className="text-base font-semibold text-gray-100">Service Infrastructure</h3>
          <p className="text-xs text-gray-400 mt-0.5">Connection status with Node.js REST API & MongoDB</p>
        </div>

        <div className="flex items-center justify-between text-xs p-3 bg-navy-900/60 rounded-lg border border-navy-700">
          <div>
            <div className="font-semibold text-gray-200">Express API Server</div>
            <div className="text-gray-500 font-mono">http://localhost:5000</div>
          </div>
          <span className={`px-2 py-1 rounded font-semibold ${
            serverHealth?.status === "ok"
              ? "bg-green-900/40 text-green-400 border border-green-700"
              : "bg-red-900/40 text-red-400 border border-red-700"
          }`}>
            {serverHealth?.status === "ok" ? "HEALTHY" : "OFFLINE"}
          </span>
        </div>
      </div>
    </div>
  );
}

