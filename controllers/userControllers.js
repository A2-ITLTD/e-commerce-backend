// controllers/userController.js
const User = require('../models/userSchema');
const Order = require('../models/orderSchema');
const { sanitizeInput } = require('../utils/sanitizeInput');

// @desc    Get logged-in user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const sanitizedUserId = sanitizeInput(req.user.id);

    const user = await User.findById(sanitizedUserId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Get User Profile Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all user orders
// @route   GET /api/users/orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    const sanitizedUserId = sanitizeInput(req.user.id);

    const orders = await Order.find({ user: sanitizedUserId }).populate(
      'items.product'
    );
    res.status(200).json(orders);
  } catch (error) {
    console.error('Get User Orders Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get order details by ID
// @route   GET /api/users/orders/:id
// @access  Private
const getUserOrderById = async (req, res) => {
  try {
    const sanitizedUserId = sanitizeInput(req.user.id);
    const sanitizedOrderId = sanitizeInput(req.params.id);

    const order = await Order.findOne({
      _id: sanitizedOrderId,
      user: sanitizedUserId,
    }).populate('items.product');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.status(200).json(order);
  } catch (error) {
    console.error('Get User Order Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
const getUserWishlist = async (req, res) => {
  try {
    const sanitizedUserId = sanitizeInput(req.user.id);

    const user = await User.findById(sanitizedUserId).populate('wishlist');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user.wishlist);
  } catch (error) {
    console.error('Get Wishlist Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add/Remove item from wishlist
// @route   POST /api/users/wishlist
// @access  Private
const toggleWishlist = async (req, res) => {
  try {
    const sanitizedUserId = sanitizeInput(req.user.id);
    const productId = sanitizeInput(req.body.productId);

    const user = await User.findById(sanitizedUserId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const index = user.wishlist.indexOf(productId);
    if (index === -1) {
      user.wishlist.push(productId);
    } else {
      user.wishlist.splice(index, 1);
    }

    await user.save();
    res
      .status(200)
      .json({ message: 'Wishlist updated', wishlist: user.wishlist });
  } catch (error) {
    console.error('Toggle Wishlist Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  getUserOrders,
  getUserOrderById,
  getUserWishlist,
  toggleWishlist,
};
