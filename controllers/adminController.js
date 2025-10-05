const User = require('../models/userSchema');
const Order = require('../models/orderSchema');
const Product = require('../models/productSchema');
const { sanitizeInput } = require('../utils/sanitizeInput');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalRevenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    res.json({
      users: totalUsers,
      orders: totalOrders,
      products: totalProducts,
      revenue: totalRevenue,
    });
  } catch (error) {
    console.error('Admin Stats Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
};

// @desc    Get all orders (for admin panel)
// @route   GET /api/admin/orders
// @access  Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Admin Orders Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// @desc    Update order status (admin panel)
// @route   PUT /api/admin/orders/:orderId/status
// @access  Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Update Order Status Error:', error.message);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = async (req, res) => {
  try {
    const userId = sanitizeInput(req.params.id);

    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error('Get All Users Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Get User Profile Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAdminStats,
  getAllOrders,
  updateOrderStatus,
  deleteUser,
  getAllUsers,
  getUserProfile,
};
