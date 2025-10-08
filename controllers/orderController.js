const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/orderSchema');
const Product = require('../models/productSchema');
const { sanitizeInput } = require('../utils/sanitizeInput');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      total,
      tax,
      shippingCost,
      grandTotal,
    } = req.body;
    const userId = req.user.id;

    console.log('Creating order with data:', {
      items: items.length,
      paymentMethod,
      total,
      tax,
      shippingCost,
      grandTotal,
    });

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    const cleanShipping = sanitizeInput(shippingAddress);

    // Validate products and calculate totals if not provided
    let calculatedTotal = total;
    let calculatedGrandTotal = grandTotal;

    if (!total || !grandTotal) {
      calculatedTotal = 0;
      let discountTotal = 0;

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            message: `Product not found: ${item.product}`,
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.title}. Available: ${product.stock}`,
          });
        }

        const price = item.price || product.price;
        calculatedTotal += price * item.quantity;

        if (item.discountPrice) {
          discountTotal += (product.price - item.discountPrice) * quantity;
        }
      }

      const calculatedShippingCost = calculatedTotal > 50 ? 0 : 9.99;
      const calculatedTax = calculatedTotal * 0.1;
      calculatedGrandTotal =
        calculatedTotal +
        calculatedShippingCost +
        calculatedTax -
        discountTotal;
    }

    // Generate Order ID
    const generateOrderId = () => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(1000 + Math.random() * 9000);
      return `ORD${timestamp}${random}`;
    };

    const orderId = generateOrderId();

    // Prepare order items with safe image access
    const orderItems = items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      name: item.name || `Product ${item.product}`,
    }));

    // Create order object - using ONLY valid enum values from your schema
    const orderData = {
      user: userId,
      items: orderItems,
      total: calculatedTotal,
      discountTotal: 0,
      grandTotal: calculatedGrandTotal,
      orderId: orderId,
      shippingAddress: {
        fullName: cleanShipping.fullName,
        phone: cleanShipping.phone,
        street: cleanShipping.street,
        city: cleanShipping.city,
        state: cleanShipping.state,
        postalCode: cleanShipping.postalCode, // Added postalCode
        country: cleanShipping.country,
      },
      paymentMethod: paymentMethod,
      paymentStatus: 'pending', // Valid enum value: 'pending'
      status: 'pending', // Valid enum value: 'pending'
      paymentDetails: {},
      trackingHistory: [
        {
          location: 'Order placed',
          status: 'pending',
          date: new Date(),
        },
      ],
    };

    // Handle Stripe Payment
    if (paymentMethod === 'Stripe') {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(calculatedGrandTotal * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            orderId: orderId,
            userId: userId.toString(),
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Add Stripe payment details
        orderData.paymentDetails = {
          id: paymentIntent.id,
          status: 'requires_payment_method',
        };

        const order = new Order(orderData);
        const savedOrder = await order.save();

        return res.status(201).json({
          clientSecret: paymentIntent.client_secret,
          order: savedOrder,
          requiresAction: paymentIntent.status === 'requires_action',
        });
      } catch (stripeError) {
        console.error('Stripe payment intent error:', stripeError);
        return res.status(400).json({
          message: 'Payment processing failed',
          error: stripeError.message,
        });
      }
    }

    // Handle COD payment
    const order = new Order(orderData);
    const savedOrder = await order.save();

    // Update product stock for COD orders
    if (paymentMethod === 'COD') {
      for (const item of items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      message: 'Server error creating order',
      error: error.message,
    });
  }
};

// Confirm Stripe Payment
const confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Update with valid enum values
      order.status = 'processing';
      order.paymentStatus = 'processing';
      order.paymentDetails.paidAt = new Date();
      order.paymentDetails.email = paymentIntent.receipt_email;

      // Add to tracking history
      order.trackingHistory.push({
        location: 'Payment confirmed',
        status: 'processing',
        date: new Date(),
      });

      // Update product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      await order.save();

      res.json({
        success: true,
        order,
        message: 'Payment confirmed successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      message: 'Error confirming payment',
      error: error.message,
    });
  }
};

// ... rest of your functions remain the same
// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Admin
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'title price');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
const getUserOrders = async (req, res) => {
  // try {
  const orders = await Order.find({ user: req.user.id }).populate(
    'items.product',
    'title price'
  );
  res.json(orders);
  // } catch (error) {
  //   res.status(500).json({ message: 'Server error' });
  // }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private/Admin
const getOrderById = async (req, res) => {
  // try {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'title price');

  if (!order) return res.status(404).json({ message: 'Order not found' });

  res.json(order);
  // } catch (error) {
  //   res.status(500).json({ message: 'Server error' });
  // }
};
// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params; // order ID from URL
    const { status, paymentStatus, location } = req.body;

    // Find existing order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status if provided
    if (status) order.status = status;

    // Update payment status if provided
    if (paymentStatus) order.paymentStatus = paymentStatus;

    // Add a tracking update if location provided
    if (location) {
      order.trackingHistory.push({
        location,
        status: status || order.status,
        date: new Date(),
      });
    }

    // Save updated order
    const updatedOrder = await order.save();

    res.status(200).json({
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      message: 'Server error updating order',
      error: error.message,
    });
  }
};
// @desc    Delete order (Admin)
// @route   DELETE /api/orders/:id
// @access  Admin
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await order.deleteOne();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  confirmStripePayment,
};
