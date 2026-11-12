import { useState, useCallback, useEffect } from 'react';
import { monitoringAPI, deviceAPI, faultAPI } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LatencyChart } from '../components/LatencyChart';
import { PacketLossChart } from '../components/PacketLossChart';
import { usePolling } from '../hooks/usePolling';

export function Monitoring() {
  const [devices, setDevices] = useState([]);
  const [latestMonitoring, setLatestMonitoring] = useState([]);
  const [selectedHost, setSelectedHost] = useState(null);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [deviceAnalytics, setDeviceAnalytics] = useState(null);
  const [deviceFaults, setDeviceFaults] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Poll latest status
  const fetchLiveStatus = useCallback(async () => {
    try {
      const [devRes, monRes] = await Promise.all([
        deviceAPI.getAll().catch(() => ({ data: [] })),
        monitoringAPI.getLatest().catch(() => ({ data: [] })),
      ]);
      setDevices(devRes.data || []);
      setLatestMonitoring(monRes.data || []);
    } catch (err) {
      console.error('Failed to poll monitoring data:', err);
    }
  }, []);

  usePolling(fetchLiveStatus, 5000);

  // When a host is selected, fetch its history, analytics, and faults
  const fetchHostDetails = useCallback(async (host) => {
    if (!host) return;
    setLoadingDetails(true);
    try {
      const [histRes, analRes, faultsRes] = await Promise.all([
        monitoringAPI.getHistory(host).catch(() => ({ data: [] })),
        monitoringAPI.getAnalytics(host).catch(() => ({ data: null })),
        faultAPI.getAll().catch(() => ({ data: [] })),
      ]);

      setDeviceHistory(histRes.data || []);
      setDeviceAnalytics(analRes.data || null);

      const hostFaults = (faultsRes.data || []).filter(f => f.host === host);
      setDeviceFaults(hostFaults);
    } catch (err) {
      console.error('Failed to fetch host details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedHost) {
      fetchHostDetails(selectedHost);
    }
  }, [selectedHost, fetchHostDetails]);

  // Auto-select first device if none selected
  useEffect(() => {
    if (!selectedHost && devices.length > 0) {
      setSelectedHost(devices[0].host);
    }
  }, [devices, selectedHost]);

  const monMap = {};
  latestMonitoring.forEach(m => { monMap[m.host] = m; });
  const selectedMon = monMap[selectedHost];
  const selectedDevice = devices.find(d => d.host === selectedHost);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Live Device Monitoring</h2>
          <p className="text-sm text-gray-400">Real-time ICMP ping and TCP port diagnostics</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-navy-800 px-3 py-1.5 rounded-lg border border-navy-600 text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
          Live Stream
        </div>
      </div>

      {/* Main Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Status Table - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-navy-800 rounded-xl border border-navy-600 overflow-hidden">
            <div className="p-4 border-b border-navy-600 bg-navy-900/40 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-200">Network Endpoints ({devices.length})</span>
              <span className="text-xs text-gray-400">Select a device to inspect telemetry</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-600 bg-navy-900/50">
                    {['Device', 'Host', 'ICMP Status', 'Latency', 'Loss', 'TCP Port', 'TCP Status'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {devices.map(device => {
                    const mon = monMap[device.host];
                    const isSelected = device.host === selectedHost;
                    return (
                      <tr
                        key={device._id || device.host}
                        onClick={() => setSelectedHost(device.host)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/20 border-l-4 border-l-blue-500' : 'hover:bg-navy-700/40'
                          }`}
                      >
                        <td className="py-3 px-3 font-medium text-gray-200">
                          {device.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-blue-400">
                          {device.host}
                        </td>
                        <td className="py-3 px-3">
                          {mon ? <StatusBadge status={mon.status} /> : <span className="text-xs text-gray-500">Wait</span>}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {mon?.latency != null ? `${mon.latency} ms` : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {mon?.packet_loss != null ? `${mon.packet_loss}%` : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-gray-400">
                          {device.tcp_port}
                        </td>
                        <td className="py-3 px-3">
                          {mon?.tcp_status ? <StatusBadge status={mon.tcp_status} /> : <span className="text-xs text-gray-500">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Device Performance Charts */}
          {selectedHost && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LatencyChart
                data={deviceHistory}
                title={`Latency Trend — ${selectedDevice?.name || selectedHost}`}
              />
              <PacketLossChart
                data={deviceHistory}
                title={`Packet Loss Trend — ${selectedDevice?.name || selectedHost}`}
              />
            </div>
          )}
        </div>

        {/* Device Inspection Inspector - Right Column */}
        <div className="space-y-4">
          <div className="bg-navy-800 rounded-xl border border-navy-600 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-navy-600 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-100">
                  {selectedDevice?.name || selectedHost || 'Select a Device'}
                </h3>
                <span className="font-mono text-xs text-blue-400">{selectedHost}</span>
              </div>
              {selectedMon && <StatusBadge status={selectedMon.status} />}
            </div>

            {loadingDetails ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading telemetry...</div>
            ) : !selectedHost ? (
              <div className="text-center py-8 text-gray-500 text-sm">Click any device to view metrics</div>
            ) : (
              <>
                {/* Real-time stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-navy-900/60 p-3 rounded-lg border border-navy-700">
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Latency</span>
                    <div className="text-xl font-bold text-blue-400 mt-1">
                      {selectedMon?.latency != null ? `${selectedMon.latency} ms` : '—'}
                    </div>
                  </div>
                  <div className="bg-navy-900/60 p-3 rounded-lg border border-navy-700">
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Packet Loss</span>
                    <div className="text-xl font-bold text-amber-400 mt-1">
                      {selectedMon?.packet_loss != null ? `${selectedMon.packet_loss}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-navy-900/60 p-3 rounded-lg border border-navy-700">
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Availability</span>
                    <div className="text-xl font-bold text-purple-400 mt-1">
                      {deviceAnalytics?.availability_percent != null ? `${deviceAnalytics.availability_percent}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-navy-900/60 p-3 rounded-lg border border-navy-700">
                    <span className="text-[11px] text-gray-400 uppercase font-semibold">Avg Latency</span>
                    <div className="text-xl font-bold text-cyan-400 mt-1">
                      {deviceAnalytics?.avg_latency != null ? `${deviceAnalytics.avg_latency} ms` : '—'}
                    </div>
                  </div>
                </div>

                {/* TCP diagnostics */}
                <div className="bg-navy-900/50 p-3.5 rounded-lg border border-navy-700 space-y-2">
                  <span className="text-xs font-semibold text-gray-300">TCP Port Diagnostics</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Target Port:</span>
                    <span className="font-mono text-gray-200">{selectedDevice?.tcp_port || selectedMon?.tcp_port || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Port State:</span>
                    {selectedMon?.tcp_status ? <StatusBadge status={selectedMon.tcp_status} /> : <span className="text-gray-500">—</span>}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">TCP Fault:</span>
                    <span className={`font-medium ${selectedMon?.tcp_fault !== 'No Fault' ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedMon?.tcp_fault || 'No Fault'}
                    </span>
                  </div>
                </div>

                {/* Device Fault History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300">Fault History</span>
                    <span className="text-[11px] text-gray-500">{deviceFaults.length} events</span>
                  </div>

                  {deviceFaults.length === 0 ? (
                    <div className="text-xs text-gray-500 py-3 text-center bg-navy-900/30 rounded-lg">
                      No faults detected on this device
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {deviceFaults.map((f, i) => (
                        <div key={i} className="text-xs bg-navy-900/80 p-2.5 rounded border border-navy-700 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-200">{f.fault_type}</div>
                            <div className="text-[10px] text-gray-500">
                              {new Date(f.first_detected).toLocaleTimeString()}
                            </div>
                          </div>
                          <StatusBadge status={f.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

