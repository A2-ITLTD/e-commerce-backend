const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/orderSchema');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      const order = await Order.findOne({ orderId });
      if (order) {
        order.paymentStatus = 'delivered';
        order.status = 'processing';
        order.paymentDetails.paidAt = new Date();
        await order.save();
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
