import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const PAYMONGO_BASE = 'https://api.paymongo.com/v1';
const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY!;
const authHeader = 'Basic ' + Buffer.from(PAYMONGO_SECRET + ':').toString('base64');

type PaymentMethodType = 'gcash' | 'paymaya' | 'card';

// POST /api/v1/payments/create
// Creates a PaymentIntent + PaymentMethod and returns redirect URL (for e-wallets)
router.post('/create', async (req, res) => {
  try {
    const { sessionId, paymentType, successUrl, failedUrl } = req.body;

    if (!sessionId || !paymentType) {
      return res.status(400).json({ error: 'sessionId and paymentType are required' });
    }

    const session = await prisma.chargingSession.findUnique({
      where: { id: sessionId },
      include: { station: { select: { name: true } } },
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.totalAmount) return res.status(400).json({ error: 'Session has no amount' });
    if (session.paymentStatus === 'PAID') return res.status(400).json({ error: 'Already paid' });

    const amountCentavos = Math.round(Number(session.totalAmount) * 100);

    // 1. Create PaymentMethod
    const pmBody: any = {
      data: {
        attributes: {
          type: paymentType,
          ...(paymentType === 'gcash' || paymentType === 'paymaya'
            ? { billing: { name: 'EV Driver', email: 'driver@evchargingph.com', phone: '09171234567' } }
            : {}
          ),
        },
      },
    };

    const pmRes = await fetch(`${PAYMONGO_BASE}/payment_methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(pmBody),
    });
    const pmData = await pmRes.json() as any;
    if (!pmRes.ok) {
      console.error('PaymentMethod error:', pmData);
      return res.status(400).json({ error: pmData.errors?.[0]?.detail ?? 'Failed to create payment method' });
    }
    const paymentMethodId = pmData.data.id;

    // 2. Create PaymentIntent
    const piRes = await fetch(`${PAYMONGO_BASE}/payment_intents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            payment_method_allowed: [paymentType],
            payment_method_options: { card: { request_three_d_secure: 'any' } },
            currency: 'PHP',
            capture_type: 'automatic',
            description: `EV Charging - ${session.station.name}`,
          },
        },
      }),
    });
    const piData = await piRes.json() as any;
    if (!piRes.ok) {
      console.error('PaymentIntent error:', piData);
      return res.status(400).json({ error: piData.errors?.[0]?.detail ?? 'Failed to create payment intent' });
    }
    const paymentIntentId = piData.data.id;
    const clientKey = piData.data.attributes.client_key;

    // 3. Attach PaymentMethod to PaymentIntent
    const attachRes = await fetch(`${PAYMONGO_BASE}/payment_intents/${paymentIntentId}/attach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
            return_url: successUrl ?? 'https://evchargingph.app/payment/success',
          },
        },
      }),
    });
    const attachData = await attachRes.json() as any;
    if (!attachRes.ok) {
      console.error('Attach error:', attachData);
      return res.status(400).json({ error: attachData.errors?.[0]?.detail ?? 'Failed to attach payment method' });
    }

    const attrs = attachData.data.attributes;
    const redirectUrl = attrs.next_action?.redirect?.url ?? null;
    const status = attrs.status;

    // Save paymentIntentId to session
    await prisma.chargingSession.update({
      where: { id: sessionId },
      data: { paymongoId: paymentIntentId },
    });

    res.json({
      data: {
        paymentIntentId,
        clientKey,
        redirectUrl,
        status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// POST /api/v1/payments/confirm — poll payment status
router.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId, sessionId } = req.body;
    if (!paymentIntentId || !sessionId) {
      return res.status(400).json({ error: 'paymentIntentId and sessionId are required' });
    }

    const piRes = await fetch(`${PAYMONGO_BASE}/payment_intents/${paymentIntentId}`, {
      headers: { Authorization: authHeader },
    });
    const piData = await piRes.json() as any;
    const status = piData.data?.attributes?.status;

    if (status === 'succeeded') {
      await prisma.chargingSession.update({
        where: { id: sessionId },
        data: { paymentStatus: 'PAID' },
      });
      return res.json({ data: { status: 'succeeded' } });
    }

    res.json({ data: { status } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

export default router;
