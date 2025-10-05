// controllers/salesController.js
const Order = require('../models/orderSchema');
const Product = require('../models/productSchema');

// @desc    Get product-wise sales report
// @route   GET /api/admin/sales/product/:productId
// @access  Admin
const getProductSales = async (req, res) => {
  try {
    const { productId } = req.params;

    // Fetch orders containing this product
    const orders = await Order.find({
      'items.product': productId,
      status: 'delivered',
    })
      .populate('items.product')
      .populate('user', 'name email');

    if (!orders.length) {
      return res.status(404).json({ message: 'No sales for this product yet' });
    }

    let totalQuantity = 0;
    let totalRevenue = 0;

    const orderDetails = orders.map((order) => {
      const productItem = order.items.find(
        (i) => i.product._id.toString() === productId
      );
      const quantity = productItem.quantity;
      const price = productItem.price;
      totalQuantity += quantity;
      totalRevenue += quantity * price;

      return {
        orderId: order._id,
        customer: order.user,
        quantity,
        price,
        total: quantity * price,
        date: order.createdAt,
        category: productItem.product.category?.name || 'N/A',
        subCategory: productItem.product.subCategory?.name || 'N/A',
      };
    });

    res.status(200).json({
      product: orders[0].items.find(
        (i) => i.product._id.toString() === productId
      ).product.title,
      totalOrders: orders.length,
      totalQuantity,
      totalRevenue,
      orders: orderDetails,
    });
  } catch (error) {
    console.error('Product Sales Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Print invoice for a specific order
// @route   GET /api/admin/sales/invoice/:orderId
// @access  Admin
const getInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const invoiceData = {
      orderId: order._id,
      customer: order.user,
      date: order.createdAt,
      items: order.items.map((item) => ({
        product: item.product.title,
        category: item.product.category?.name || 'N/A',
        subCategory: item.product.subCategory?.name || 'N/A',
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      totalAmount: order.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      ),
    };

    res.status(200).json(invoiceData);
  } catch (error) {
    console.error('Invoice Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProductSales,
  getInvoice,
};
