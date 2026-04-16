import { Router } from 'express';
import { Prisma } from '@prisma/client';
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

// GET /api/v1/stations?lat=14.5995&lng=120.9842&radius=10&q=evro
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = '10', q } = req.query;
    const searchTerm = typeof q === 'string' && q.trim() ? q.trim() : null;
    const likeParam = searchTerm ? `%${searchTerm}%` : null;
    const searchFilter = likeParam
      ? Prisma.sql`AND (s.name ILIKE ${likeParam} OR s.city ILIKE ${likeParam} OR s.address ILIKE ${likeParam})`
      : Prisma.empty;

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
        ${searchFilter}
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
        ${searchFilter}
        GROUP BY s.id
        ORDER BY s.name ASC
        LIMIT 2000
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

    // Fetch ports with active session data for OCCUPIED ports
    const ports = await prisma.$queryRaw<any[]>`
      SELECT
        p.id, p.port_number, p.connector_type, p.charging_speed,
        p.max_kw, p.price_per_kwh, p.currency, p.status,
        cs.started_at AS session_started_at,
        cs.target_kwh AS session_target_kwh,
        cs.id AS session_id
      FROM ports p
      LEFT JOIN charging_sessions cs
        ON cs.port_id = p.id
        AND cs.status IN ('CHARGING', 'INITIATED')
      WHERE p.station_id = ${id}
      ORDER BY p.port_number ASC
    `;

    const serializedPorts = ports.map(p => ({
      id: p.id,
      port_number: p.port_number,
      connector_type: p.connector_type,
      charging_speed: p.charging_speed,
      max_kw: Number(p.max_kw),
      price_per_kwh: p.price_per_kwh,
      currency: p.currency,
      status: p.status,
      session_started_at: p.session_started_at ?? null,
      session_target_kwh: p.session_target_kwh ? Number(p.session_target_kwh) : null,
    }));

    res.json({ data: { ...serializeStation(station), ports: serializedPorts } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

export default router;
