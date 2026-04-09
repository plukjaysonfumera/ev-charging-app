'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface SessionPort {
  portNumber: string;
  connectorType: string;
}

interface SessionUser {
  displayName: string;
  email: string;
}

interface Session {
  id: string;
  stationId: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  energyKwh: number | null;
  durationMinutes: number | null;
  totalAmount: string | null;
  paymentStatus: string;
  port: SessionPort;
  user: SessionUser;
}

interface StationSessions {
  stationName: string;
  stationId: string;
  sessions: Session[];
}

function paymentBadge(status: string) {
  const map: Record<string, string> = {
    PAID: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    FAILED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-blue-100 text-blue-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function sessionStatusBadge(status: string) {
  const map: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    CHARGING: 'bg-blue-100 text-blue-700',
    INITIATED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-amber-100 text-amber-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function formatDateTime(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(mins: number | null) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function SessionsPage() {
  const [allData, setAllData] = useState<StationSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = localStorage.getItem('adminUid');
    if (!uid) return;

    (async () => {
      try {
        const stations = await apiFetch(`/api/v1/admin/stations?firebaseUid=${uid}`);
        const results = await Promise.all(
          stations.map(async (st: { id: string; name: string }) => {
            try {
              const sessions = await apiFetch(`/api/v1/admin/stations/${st.id}/sessions`);
              return { stationName: st.name, stationId: st.id, sessions };
            } catch {
              return { stationName: st.name, stationId: st.id, sessions: [] };
            }
          })
        );
        setAllData(results);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allSessions: Array<Session & { stationName: string }> = allData.flatMap((d) =>
    d.sessions.map((s) => ({ ...s, stationName: d.stationName }))
  );

  // Sort by startedAt desc
  allSessions.sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <p className="text-gray-500 text-sm mt-1">All charging sessions across your stations</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#0A84FF' }} />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      ) : allSessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#EFF6FF' }}>
            <svg className="w-8 h-8" style={{ color: '#0A84FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No sessions found. Sessions will appear here once users start charging.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">{allSessions.length} session{allSessions.length !== 1 ? 's' : ''} total</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Station</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Port</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">User</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Start Time</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Duration</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Energy (kWh)</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 max-w-[160px] truncate">{session.stationName}</td>
                    <td className="px-6 py-4 text-gray-600">
                      #{session.port.portNumber}
                      <span className="text-xs text-gray-400 ml-1">({session.port.connectorType})</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-[140px] truncate" title={session.user.email}>
                      {session.user.displayName}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatDateTime(session.startedAt)}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDuration(session.durationMinutes)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {session.energyKwh != null ? session.energyKwh.toFixed(2) : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {session.totalAmount != null ? `₱${parseFloat(session.totalAmount).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sessionStatusBadge(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${paymentBadge(session.paymentStatus)}`}>
                        {session.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
