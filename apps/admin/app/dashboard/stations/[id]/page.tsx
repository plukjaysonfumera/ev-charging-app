'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Port {
  id: string;
  portNumber: string;
  connectorType: string;
  chargingSpeed: string;
  maxKw: number;
  pricePerKwh: string;
  status: string;
}

interface StationStats {
  totalRevenue: string;
  totalSessions: number;
  avgDurationMinutes: number;
}

interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  status: string;
  networkName: string | null;
}

const CONNECTOR_TYPES = ['TYPE1', 'TYPE2', 'CCS1', 'CCS2', 'CHADEMO', 'NACS'];
const CHARGING_SPEEDS = ['LEVEL1', 'LEVEL2', 'DCFC'];
const PORT_STATUSES = ['AVAILABLE', 'OCCUPIED', 'FAULTED', 'OFFLINE'];

function portStatusBadge(status: string) {
  const map: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    OCCUPIED: 'bg-amber-100 text-amber-700',
    FAULTED: 'bg-red-100 text-red-700',
    OFFLINE: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

const emptyPortForm = {
  portNumber: '',
  connectorType: 'CCS2',
  chargingSpeed: 'DCFC',
  maxKw: '',
  pricePerKwh: '',
};

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [station, setStation] = useState<Station | null>(null);
  const [ports, setPorts] = useState<Port[]>([]);
  const [stats, setStats] = useState<StationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Port add form
  const [showAddPort, setShowAddPort] = useState(false);
  const [portForm, setPortForm] = useState(emptyPortForm);
  const [portSubmitting, setPortSubmitting] = useState(false);
  const [portFormError, setPortFormError] = useState('');

  // Inline edit state
  const [editingPortId, setEditingPortId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ pricePerKwh: string; maxKw: string; status: string }>({
    pricePerKwh: '', maxKw: '', status: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [portsData, statsData, stationsData] = await Promise.all([
        apiFetch(`/api/v1/admin/stations/${id}/ports`),
        apiFetch(`/api/v1/admin/stations/${id}/stats`),
        apiFetch(`/api/v1/admin/stations?firebaseUid=${localStorage.getItem('adminUid') ?? ''}`),
      ]);
      setPorts(portsData);
      setStats(statsData);
      const found = stationsData.find((s: Station) => s.id === id);
      if (found) setStation(found);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddPort(e: React.FormEvent) {
    e.preventDefault();
    setPortFormError('');
    setPortSubmitting(true);
    try {
      await apiFetch(`/api/v1/admin/stations/${id}/ports`, {
        method: 'POST',
        body: JSON.stringify({
          ...portForm,
          maxKw: parseFloat(portForm.maxKw),
          pricePerKwh: parseFloat(portForm.pricePerKwh),
        }),
      });
      setPortForm(emptyPortForm);
      setShowAddPort(false);
      await loadData();
    } catch (e: unknown) {
      setPortFormError(e instanceof Error ? e.message : 'Failed to add port');
    } finally {
      setPortSubmitting(false);
    }
  }

  function startEdit(port: Port) {
    setEditingPortId(port.id);
    setEditForm({ pricePerKwh: String(port.pricePerKwh), maxKw: String(port.maxKw), status: port.status });
  }

  async function handleSaveEdit(portId: string) {
    setEditSaving(true);
    try {
      await apiFetch(`/api/v1/admin/ports/${portId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          pricePerKwh: parseFloat(editForm.pricePerKwh),
          maxKw: parseFloat(editForm.maxKw),
          status: editForm.status,
        }),
      });
      setEditingPortId(null);
      await loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update port');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeletePort(portId: string) {
    try {
      await apiFetch(`/api/v1/admin/ports/${portId}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      await loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete port');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#0A84FF' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/stations')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Stations
      </button>

      {/* Station header */}
      {station && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{station.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{station.address}, {station.city}, {station.province}</p>
          {station.networkName && <p className="text-xs text-gray-400 mt-0.5">Network: {station.networkName}</p>}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Revenue" value={`₱${parseFloat(stats.totalRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} />
          <StatCard label="Total Sessions" value={String(stats.totalSessions)} />
          <StatCard label="Avg Duration" value={`${stats.avgDurationMinutes} min`} />
        </div>
      )}

      {/* Ports section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Charging Ports</h2>
          <button
            onClick={() => { setShowAddPort(!showAddPort); setPortFormError(''); }}
            className="px-4 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#0A84FF' }}
          >
            {showAddPort ? 'Cancel' : '+ Add Port'}
          </button>
        </div>

        {/* Add port form */}
        {showAddPort && (
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">New Port</h3>
            {portFormError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{portFormError}</div>
            )}
            <form onSubmit={handleAddPort} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Port # *</label>
                <input
                  required value={portForm.portNumber}
                  onChange={(e) => setPortForm((f) => ({ ...f, portNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Connector *</label>
                <select
                  value={portForm.connectorType}
                  onChange={(e) => setPortForm((f) => ({ ...f, connectorType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  {CONNECTOR_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Speed *</label>
                <select
                  value={portForm.chargingSpeed}
                  onChange={(e) => setPortForm((f) => ({ ...f, chargingSpeed: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  {CHARGING_SPEEDS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max kW *</label>
                <input
                  required type="number" step="any" min="0" value={portForm.maxKw}
                  onChange={(e) => setPortForm((f) => ({ ...f, maxKw: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price/kWh (₱) *</label>
                <input
                  required type="number" step="any" min="0" value={portForm.pricePerKwh}
                  onChange={(e) => setPortForm((f) => ({ ...f, pricePerKwh: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 12.50"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit" disabled={portSubmitting}
                  className="flex-1 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-60 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#0A84FF' }}
                >
                  {portSubmitting ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ports table */}
        {ports.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No ports yet. Click &ldquo;Add Port&rdquo; to add charging ports to this station.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Port #</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Connector</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Speed</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Max kW</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Price/kWh</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ports.map((port) => {
                  const isEditing = editingPortId === port.id;
                  return (
                    <tr key={port.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}>
                      <td className="px-6 py-4 font-medium text-gray-900">{port.portNumber}</td>
                      <td className="px-6 py-4 text-gray-600">{port.connectorType}</td>
                      <td className="px-6 py-4 text-gray-600">{port.chargingSpeed}</td>

                      {/* Max kW */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number" step="any" min="0" value={editForm.maxKw}
                            onChange={(e) => setEditForm((f) => ({ ...f, maxKw: e.target.value }))}
                            className="w-20 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none"
                          />
                        ) : (
                          <span className="text-gray-700">{port.maxKw}</span>
                        )}
                      </td>

                      {/* Price per kWh */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number" step="any" min="0" value={editForm.pricePerKwh}
                            onChange={(e) => setEditForm((f) => ({ ...f, pricePerKwh: e.target.value }))}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none"
                          />
                        ) : (
                          <span className="text-gray-700">₱{parseFloat(String(port.pricePerKwh)).toFixed(4)}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                            className="px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none"
                          >
                            {PORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${portStatusBadge(port.status)}`}>
                            {port.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(port.id)}
                              disabled={editSaving}
                              className="px-3 py-1 text-xs font-medium text-white rounded disabled:opacity-60"
                              style={{ backgroundColor: '#0A84FF' }}
                            >
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingPortId(null)}
                              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : deleteConfirm === port.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <button
                              onClick={() => handleDeletePort(port.id)}
                              className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit button */}
                            <button
                              onClick={() => startEdit(port)}
                              title="Edit"
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {/* Delete button */}
                            <button
                              onClick={() => setDeleteConfirm(port.id)}
                              title="Delete"
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
