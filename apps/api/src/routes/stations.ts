import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

function serializeStation(s: any) {
  return {
    ...s,
    review_count: Number(s.review_count),
    port_count: Number(s.port_count),
    average_rating: Number(s.average_rating),
    distance_meters: s.distance_meters ? Number(s.distance_meters) : undefined,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    has_available: Boolean(s.has_available),
    connector_types: s.connector_types ?? [],
  };
}

// GET /api/v1/stations?lat=14.5995&lng=120.9842&radius=10
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = '10' } = req.query;

    let stations: any[];

    if (lat && lng) {
      const radiusMeters = parseFloat(radius as string) * 1000;
      stations = await prisma.$queryRaw`
        SELECT
          s.id, s.name, s.address, s.city, s.province,
          s.status, s.amenities, s.photos, s.network_name,
          ST_X(s.location::geometry) AS longitude,
          ST_Y(s.location::geometry) AS latitude,
          ST_Distance(s.location, ST_MakePoint(${parseFloat(lng as string)}, ${parseFloat(lat as string)})::geography) AS distance_meters,
          COALESCE(AVG(r.rating), 0) AS average_rating,
          COUNT(DISTINCT r.id) AS review_count,
          COUNT(DISTINCT p.id) AS port_count,
          BOOL_OR(p.status = 'AVAILABLE') AS has_available,
          ARRAY_AGG(DISTINCT p."connector_type") FILTER (WHERE p."connector_type" IS NOT NULL) AS connector_types
        FROM stations s
        LEFT JOIN reviews r ON r.station_id = s.id
        LEFT JOIN ports p ON p.station_id = s.id
        WHERE ST_DWithin(
          s.location,
          ST_MakePoint(${parseFloat(lng as string)}, ${parseFloat(lat as string)})::geography,
          ${radiusMeters}
        )
        AND s.status = 'ACTIVE'
        GROUP BY s.id
        ORDER BY distance_meters ASC
      `;
    } else {
      stations = await prisma.$queryRaw`
        SELECT
          s.id, s.name, s.address, s.city, s.province,
          s.status, s.amenities, s.photos, s.network_name,
          ST_X(s.location::geometry) AS longitude,
          ST_Y(s.location::geometry) AS latitude,
          COALESCE(AVG(r.rating), 0) AS average_rating,
          COUNT(DISTINCT r.id) AS review_count,
          COUNT(DISTINCT p.id) AS port_count,
          BOOL_OR(p.status = 'AVAILABLE') AS has_available,
          ARRAY_AGG(DISTINCT p."connector_type") FILTER (WHERE p."connector_type" IS NOT NULL) AS connector_types
        FROM stations s
        LEFT JOIN reviews r ON r.station_id = s.id
        LEFT JOIN ports p ON p.station_id = s.id
        WHERE s.status = 'ACTIVE'
        GROUP BY s.id
        ORDER BY s.name ASC
        LIMIT 100
      `;
    }

    res.json({ data: stations.map(serializeStation) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// GET /api/v1/stations/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [station] = await prisma.$queryRaw<any[]>`
      SELECT
        s.id, s.name, s.address, s.city, s.province,
        s.status, s.amenities, s.photos, s.network_name,
        s.phone, s.website, s.opening_hours,
        ST_X(s.location::geometry) AS longitude,
        ST_Y(s.location::geometry) AS latitude,
        COALESCE(AVG(r.rating), 0) AS average_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM stations s
      LEFT JOIN reviews r ON r.station_id = s.id
      WHERE s.id = ${id}
      GROUP BY s.id
    `;

    if (!station) return res.status(404).json({ error: 'Station not found' });

    const ports = await prisma.port.findMany({ where: { stationId: id } });
    const serializedPorts = ports.map(p => ({
      id: p.id,
      port_number: p.portNumber,
      connector_type: p.connectorType,
      charging_speed: p.chargingSpeed,
      max_kw: p.maxKw,
      price_per_kwh: p.pricePerKwh,
      currency: p.currency,
      status: p.status,
    }));
    res.json({ data: { ...serializeStation(station), ports: serializedPorts } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

export default router;
