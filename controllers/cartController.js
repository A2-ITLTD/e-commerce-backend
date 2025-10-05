const Cart = require('../models/cartSchema');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product'
    );
    if (!cart)
      return res.status(200).json({ items: [], total: 0, grandTotal: 0 });

    res.status(200).json(cart);
  } catch (error) {
    console.error('Get Cart Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, price, discountPrice } = req.body;

    if (!productId || !price)
      return res
        .status(400)
        .json({ message: 'Product and price are required' });

    // Find user's cart or create new
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] }); // ✅ set user here
    }

    // Add/update product in cart
    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity ? Number(quantity) : 1;
    } else {
      cart.items.push({
        product: productId,
        quantity: quantity ? Number(quantity) : 1,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : 0,
      });
    }

    await cart.save();
    res.status(200).json({ message: 'Item added to cart', cart });
  } catch (error) {
    console.error('Add to Cart Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/item/:itemId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.quantity = quantity;
    cart.calculateTotals();
    await cart.save();

    res.status(200).json(cart);
  } catch (error) {
    console.error('Update Cart Item Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/item/:itemId
// @access  Private
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const updatedCart = await Cart.findOneAndUpdate(
      { user: userId }, // find cart by user
      { $pull: { items: { _id: itemId } } }, // remove item
      { new: true } // return updated document
    );

    if (!updatedCart)
      return res.status(404).json({ message: 'Cart not found' });

    // Recalculate totals
    updatedCart.calculateTotals();
    await updatedCart.save();

    res.status(200).json({ message: 'Item removed', cart: updatedCart });
  } catch (error) {
    console.error('Remove Cart Item Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Private
const applyCoupon = async (req, res) => {
  try {
    const { code, discount, discountType } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.coupon = { code, discount, discountType };
    cart.calculateTotals();
    await cart.save();

    res.status(200).json(cart);
  } catch (error) {
    console.error('Apply Coupon Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  applyCoupon,
};
