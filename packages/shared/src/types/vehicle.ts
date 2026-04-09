import type { ConnectorType } from './station';

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  batteryKwh: number;
  rangKm: number;
  connectors: ConnectorType[];
  licensePlate?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
