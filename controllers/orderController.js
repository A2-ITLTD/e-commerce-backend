const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/orderSchema');
const Product = require('../models/productSchema');
const { sanitizeInput } = require('../utils/sanitizeInput');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    const cleanShipping = sanitizeInput(shippingAddress);

    // --- Calculate totals ---
    let total = 0;
    let discountTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product)
        return res.status(404).json({ message: 'Product not found' });

      const price = product.price;
      const quantity = item.quantity;
      total += price * quantity;

      if (item.discountPrice) {
        discountTotal += (price - item.discountPrice) * quantity;
      }
    }

    const grandTotal = total - discountTotal;

    // --- Generate Order ID ---
    const generateOrderId = () => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(1000 + Math.random() * 9000);
      return `ORD${timestamp}${random}`;
    };

    const orderId = generateOrderId();

    // --- Create order in DB (initially unpaid) ---
    const order = new Order({
      user: userId,
      items,
      total,
      discountTotal,
      grandTotal,
      shippingAddress: cleanShipping,
      paymentMethod,
      orderId,
    });

    // --- If Stripe Payment ---
    if (paymentMethod === 'Stripe') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(grandTotal * 100),
        currency: 'usd',
        metadata: { orderId },
      });

      order.paymentDetails = {
        id: paymentIntent.id,
        paidAt: null,
      };

      const savedOrder = await order.save();

      return res.status(201).json({
        clientSecret: paymentIntent.client_secret,
        order: savedOrder,
      });
    }

    // --- Otherwise, COD (or PayPal) ---
    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Admin
const updateOrderStatus = async (req, res) => {
  try {
    console.log('=== UPDATE ORDER STATUS REQUEST ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers['content-type']);

    let { status, location } = req.body;

    // Log the raw received data
    console.log('Raw status:', status, 'Type:', typeof status);
    console.log('Raw location:', location, 'Type:', typeof location);

    // Handle different data structures
    if (status && typeof status === 'object') {
      console.log('Status is an object, extracting values...');

      // If the entire request body is nested under status
      if (status.status && status.location) {
        console.log('Found nested status and location');
        location = status.location;
        status = status.status;
      }
      // Handle other possible object structures
      else if (status.value) {
        status = status.value;
      } else if (status.label) {
        status = status.label;
      }
    }

    console.log('Processed status:', status);
    console.log('Processed location:', location);

    // Validate required fields with better error messages
    if (!status) {
      console.log('Validation failed: Status is required');
      return res.status(400).json({
        message: 'Status is required',
        receivedData: req.body,
      });
    }

    if (!location) {
      console.log('Validation failed: Location is required');
      return res.status(400).json({
        message: 'Location is required',
        receivedData: req.body,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('Updating order:', order._id);
    console.log('New status:', status);
    console.log('New location:', location);

    // Update status
    order.status = status;

    // Add to tracking history
    order.trackingHistory.push({
      status: status,
      location: location,
      timestamp: new Date(),
    });

    const updatedOrder = await order.save();

    console.log('Order updated successfully');

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      receivedData: req.body,
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
};
