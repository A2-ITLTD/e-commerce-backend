const Order = require('../models/orderSchema');

// @desc    Track order by ID
// @route   GET /api/track/:orderId
// @access  User/Admin
const trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product', 'title sku');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.json({
      orderId: order._id,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      trackingHistory: order.trackingHistory || [],
    });
  } catch (error) {
    console.error('Track Order Error:', error.message);
    res.status(500).json({ message: 'Failed to track order' });
  }
};

// @desc    Update tracking info (admin updates shipping status)
// @route   POST /api/track/:orderId
// @access  Admin
const updateTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { location, status, estimatedDelivery } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status || order.status;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;

    order.trackingHistory = order.trackingHistory || [];
    order.trackingHistory.push({
      location,
      status,
      date: new Date(),
    });

    await order.save();
    res.json({ message: 'Tracking updated', order });
  } catch (error) {
    console.error('Update Tracking Error:', error.message);
    res.status(500).json({ message: 'Failed to update tracking' });
  }
};

module.exports = { trackOrder, updateTracking };
