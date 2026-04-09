'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Station {
  id: string;
  name: string;
  city: string;
  province: string;
  status: string;
  networkName: string | null;
  _count: { ports: number; sessions: number };
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    COMING_SOON: 'bg-blue-100 text-blue-700',
    UNDER_MAINTENANCE: 'bg-amber-100 text-amber-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export default function DashboardPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = localStorage.getItem('adminUid');
    if (!uid) return;
    apiFetch(`/api/v1/admin/stations?firebaseUid=${uid}`)
      .then(setStations)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPorts = stations.reduce((s, st) => s + st._count.ports, 0);
  const activePorts = 0; // We'd need port status from a detailed fetch; show placeholder

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your charging network</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#0A84FF' }} />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Total Stations"
              value={stations.length}
              icon={
                <svg className="w-5 h-5" style={{ color: '#0A84FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <StatCard
              label="Total Ports"
              value={totalPorts}
              icon={
                <svg className="w-5 h-5" style={{ color: '#0A84FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              label="Total Sessions"
              value={stations.reduce((s, st) => s + st._count.sessions, 0)}
              icon={
                <svg className="w-5 h-5" style={{ color: '#0A84FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Stations table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Your Stations</h2>
            </div>
            {stations.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <p className="text-sm">No stations yet. Add your first station in My Stations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Location</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Ports</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stations.map((station) => (
                      <tr key={station.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{station.name}</td>
                        <td className="px-6 py-4 text-gray-500">{station.city}, {station.province}</td>
                        <td className="px-6 py-4 text-gray-700">{station._count.ports}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(station.status)}`}>
                            {station.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/stations/${station.id}`}
                            className="text-sm font-medium hover:underline"
                            style={{ color: '#0A84FF' }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
