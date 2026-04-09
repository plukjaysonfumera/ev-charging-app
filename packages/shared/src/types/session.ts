export type SessionStatus = 'INITIATED' | 'CHARGING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface ChargingSession {
  id: string;
  userId: string;
  stationId: string;
  portId: string;
  vehicleId?: string;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  energyKwh?: number;
  durationMinutes?: number;
  totalAmount?: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymongoId?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}
