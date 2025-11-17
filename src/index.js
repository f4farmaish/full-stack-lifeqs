const sdk = require('node-appwrite');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function (req, res) {
  const client = new sdk.Client();
  const database = new sdk.Databases(client);

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  if (req.path === '/create-checkout-session' && req.method === 'POST') {
    const { eventId, userId, priceId } = JSON.parse(req.body);

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment', // Use 'subscription' for recurring
        success_url: `https://your-app.com/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://your-app.com/cancel`,
        metadata: { eventId, userId },
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error('Stripe error:', error);
      res.json({ error: error.message }, 500);
    }
  } else if (req.path === '/webhook' && req.method === 'POST') {
    const sig = req.headers['x-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { eventId, userId } = session.metadata;

      await database.createDocument(
        'events',
        'orders', // Use VITE_APPWRITE_ORDRRS_COLLECTION_ID from .env.local
        sdk.ID.unique(),
        {
          userId,
          stripeCustomerId: session.customer,
          stripePaymentId: session.payment_intent,
          status: 'completed',
          eventId,
        },
        ['*', `user:${userId}`]
      );

      res.json({ success: true });
    }

    res.json({ success: true });
  } else {
    res.json({ error: 'Invalid endpoint' }, 404);
  }
};