export type ConnectorType =
  | 'TYPE1'
  | 'TYPE2'
  | 'CCS1'
  | 'CCS2'
  | 'CHADEMO'
  | 'GBAC'
  | 'GBACD'
  | 'TESLA_S'
  | 'NACS';

export type ChargingSpeed = 'LEVEL1' | 'LEVEL2' | 'DCFC';

export type StationStatus = 'ACTIVE' | 'INACTIVE' | 'COMING_SOON' | 'UNDER_MAINTENANCE';

export type PortStatus = 'AVAILABLE' | 'OCCUPIED' | 'FAULTED' | 'OFFLINE';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Port {
  id: string;
  stationId: string;
  portNumber: string;
  connectorType: ConnectorType;
  chargingSpeed: ChargingSpeed;
  maxKw: number;
  pricePerKwh: number;
  currency: string;
  status: PortStatus;
}

export interface Station {
  id: string;
  ownerId?: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  coordinates: Coordinates;
  status: StationStatus;
  amenities: string[];
  openingHours?: Record<string, string>;
  photos: string[];
  phone?: string;
  website?: string;
  networkName?: string;
  ports: Port[];
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NearbyStationsQuery {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  connectorTypes?: ConnectorType[];
  chargingSpeed?: ChargingSpeed;
  status?: StationStatus;
}
