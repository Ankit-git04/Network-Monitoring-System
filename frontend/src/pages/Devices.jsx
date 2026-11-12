import { useState, useEffect, useCallback } from 'react';
import { deviceAPI, monitoringAPI } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export function Devices() {
  const [devices, setDevices] = useState([]);
  const [latestMonitoring, setLatestMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    type: 'Server',
    tcp_port: 80,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const [devRes, monRes] = await Promise.all([
        deviceAPI.getAll().catch(() => ({ data: [] })),
        monitoringAPI.getLatest().catch(() => ({ data: [] })),
      ]);
      setDevices(devRes.data || []);
      setLatestMonitoring(monRes.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch devices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setFormData({ name: '', host: '', type: 'Server', tcp_port: 80 });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      host: device.host,
      type: device.type,
      tcp_port: device.tcp_port,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove device "${name}"?`)) return;
    try {
      await deviceAPI.delete(id);
      fetchDevices();
    } catch (err) {
      alert('Failed to delete device: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.host.trim() || !formData.type.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const port = Number(formData.tcp_port);
    if (!port || port < 1 || port > 65535) {
      setFormError('TCP port must be a valid number between 1 and 65535.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDevice) {
        await deviceAPI.update(editingDevice._id, {
          name: formData.name.trim(),
          host: formData.host.trim(),
          type: formData.type.trim(),
          tcp_port: port,
        });
      } else {
        await deviceAPI.create({
          name: formData.name.trim(),
          host: formData.host.trim(),
          type: formData.type.trim(),
          tcp_port: port,
        });
      }
      setIsModalOpen(false);
      fetchDevices();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed. Verify device details.');
    } finally {
      setSubmitting(false);
    }
  };

  const monMap = {};
  latestMonitoring.forEach(m => { monMap[m.host] = m; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Device Management</h2>
          <p className="text-sm text-gray-400">Configure and manage network devices for monitoring</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-600/30"
        >
          <span>+</span> Add Device
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Devices List Table */}
      <div className="bg-navy-800 rounded-xl border border-navy-600 overflow-hidden">
        <div className="p-4 border-b border-navy-600 flex justify-between items-center bg-navy-900/30">
          <span className="text-sm font-semibold text-gray-300">Configured Devices ({devices.length})</span>
          <button onClick={fetchDevices} className="text-xs text-blue-400 hover:underline">
            ↻ Refresh List
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No devices configured. Click "+ Add Device" above to start monitoring.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-600 bg-navy-900/40">
                  {['Device Name', 'IP / Hostname', 'Type', 'TCP Port', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {devices.map(device => {
                  const mon = monMap[device.host];
                  return (
                    <tr key={device._id || device.host} className="hover:bg-navy-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-gray-200">
                        {device.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-400">
                        {device.host}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        <span className="px-2 py-0.5 rounded text-xs bg-navy-700 text-gray-300 border border-navy-600">
                          {device.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-300">
                        Port {device.tcp_port}
                      </td>
                      <td className="py-3.5 px-4">
                        {mon ? <StatusBadge status={mon.status} /> : <span className="text-xs text-gray-500">Pending</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(device)}
                            className="px-2.5 py-1 text-xs bg-navy-700 hover:bg-navy-600 text-gray-200 rounded border border-navy-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(device._id, device.name)}
                            className="px-2.5 py-1 text-xs bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded border border-red-700/50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-600 pb-3">
              <h3 className="text-lg font-bold text-gray-100">
                {editingDevice ? 'Edit Device' : 'Add Monitored Device'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 p-3 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Device Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Primary DNS Server"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">IP Address or Hostname</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="e.g. 8.8.8.8 or dns.google"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Device Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="DNS Server">DNS Server</option>
                    <option value="Router">Router</option>
                    <option value="Switch">Switch</option>
                    <option value="Server">Server</option>
                    <option value="Firewall">Firewall</option>
                    <option value="Gateway">Gateway</option>
                    <option value="Web Server">Web Server</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">TCP Port</label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={formData.tcp_port}
                    onChange={(e) => setFormData({ ...formData, tcp_port: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-navy-600">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-300 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingDevice ? 'Save Changes' : 'Create Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

