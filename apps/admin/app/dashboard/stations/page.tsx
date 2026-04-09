'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  status: string;
  networkName: string | null;
  _count: { ports: number; sessions: number };
}

const PH_PROVINCES = [
  'Abra', 'Agusan del Norte', 'Agusan del Sur', 'Aklan', 'Albay', 'Antique', 'Apayao',
  'Aurora', 'Basilan', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Biliran', 'Bohol',
  'Bukidnon', 'Bulacan', 'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Camiguin',
  'Capiz', 'Catanduanes', 'Cavite', 'Cebu', 'Cotabato', 'Davao de Oro', 'Davao del Norte',
  'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Dinagat Islands', 'Eastern Samar',
  'Guimaras', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur', 'Iloilo', 'Isabela', 'Kalinga',
  'La Union', 'Laguna', 'Lanao del Norte', 'Lanao del Sur', 'Leyte', 'Maguindanao del Norte',
  'Maguindanao del Sur', 'Marinduque', 'Masbate', 'Metro Manila', 'Misamis Occidental',
  'Misamis Oriental', 'Mountain Province', 'Negros Occidental', 'Negros Oriental',
  'Northern Samar', 'Nueva Ecija', 'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro',
  'Palawan', 'Pampanga', 'Pangasinan', 'Quezon', 'Quirino', 'Rizal', 'Romblon', 'Samar',
  'Sarangani', 'Shariff Kabunsuan', 'Siquijor', 'Sorsogon', 'South Cotabato', 'Southern Leyte',
  'Sultan Kudarat', 'Sulu', 'Surigao del Norte', 'Surigao del Sur', 'Tarlac', 'Tawi-Tawi',
  'Zambales', 'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay',
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    COMING_SOON: 'bg-blue-100 text-blue-700',
    UNDER_MAINTENANCE: 'bg-amber-100 text-amber-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

const emptyForm = {
  name: '',
  address: '',
  city: '',
  province: 'Metro Manila',
  latitude: '',
  longitude: '',
  networkName: '',
};

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  function getUid() {
    return localStorage.getItem('adminUid') ?? '';
  }

  async function loadStations() {
    const uid = getUid();
    if (!uid) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/v1/admin/stations?firebaseUid=${uid}`);
      setStations(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load stations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStations(); }, []);

  async function handleAddStation(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/admin/stations', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          firebaseUid: getUid(),
        }),
      });
      setForm(emptyForm);
      setShowForm(false);
      await loadStations();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create station');
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Stations</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your EV charging stations</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(''); }}
          className="px-4 py-2 text-white text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#0A84FF' }}
        >
          {showForm ? 'Cancel' : '+ Add Station'}
        </button>
      </div>

      {/* Add Station Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Station</h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
          )}
          <form onSubmit={handleAddStation} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Station Name *</label>
              <input
                name="name" required value={form.name} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. SM Mall of Asia Charging Hub"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Network Name</label>
              <input
                name="networkName" value={form.networkName} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. EVRO, ChargePoint (optional)"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <input
                name="address" required value={form.address} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                name="city" required value={form.city} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Pasay"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
              <select
                name="province" required value={form.province} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                {PH_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
              <input
                name="latitude" required type="number" step="any" value={form.latitude} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 14.5353"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
              <input
                name="longitude" required type="number" step="any" value={form.longitude} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 120.9989"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button
                type="submit" disabled={submitting}
                className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#0A84FF' }}
              >
                {submitting ? 'Creating...' : 'Create Station'}
              </button>
              <button
                type="button" onClick={() => { setShowForm(false); setFormError(''); }}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stations list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#0A84FF' }} />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      ) : stations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#EFF6FF' }}>
            <svg className="w-8 h-8" style={{ color: '#0A84FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No stations yet. Click &ldquo;Add Station&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {stations.map((station) => (
            <div key={station.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{station.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge(station.status)}`}>
                      {station.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{station.address}</p>
                  <p className="text-sm text-gray-500">{station.city}, {station.province}</p>
                  {station.networkName && (
                    <p className="text-xs text-gray-400 mt-1">Network: {station.networkName}</p>
                  )}
                </div>
                <div className="flex items-center gap-6 ml-6 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{station._count.ports}</p>
                    <p className="text-xs text-gray-500">Ports</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{station._count.sessions}</p>
                    <p className="text-xs text-gray-500">Sessions</p>
                  </div>
                  <Link
                    href={`/dashboard/stations/${station.id}`}
                    className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:opacity-90 flex-shrink-0"
                    style={{ color: '#0A84FF', borderColor: '#0A84FF' }}
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
