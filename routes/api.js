const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const orderController = require('../controllers/orderController');
const cartController = require('../controllers/cartController');
const reviewController = require('../controllers/reviewController');
const userController = require('../controllers/userControllers');
const upload = require('../utils/multer');

// -------------------- Auth Routes --------------------
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forget-pass', authController.forgetPass);
router.post('/otp-verify', authController.verifyOtp);
router.post('/reset-pass', authController.resetPassword);
router.put('/update-profile', authMiddleware, authController.updateUser);
router.post('/logout', authMiddleware, authController.logOut);

// -------------------- Admin Routes --------------------
router.get('/stats', authMiddleware, adminController.getAdminStats);
router.get('/orders', authMiddleware, adminController.getAllOrders);
router.put(
  '/orders/:orderId/status',
  authMiddleware,
  adminController.updateOrderStatus
);
router.get('/users', authMiddleware, adminController.getAllUsers);
router.delete('/users/:id', authMiddleware, adminController.deleteUser);

// -------------------- Product Routes --------------------
router.get('/products', productController.getProducts);
router.get('/products/:slug', productController.getProduct);
router.post(
  '/products',
  authMiddleware,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 5 },
  ]),
  productController.createProduct
);
router.put(
  '/products/:id',
  authMiddleware,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 5 },
  ]),
  productController.updateProduct
);
router.delete('/products/:id', authMiddleware, productController.deleteProduct);
router.get(
  '/products/subcategory/:subCategoryId',
  productController.getProductsBySubcategory
);

// -------------------- Category Routes --------------------
router.get('/categories', categoryController.getCategories);
router.get('/categories/:id', categoryController.getCategory);
router.get(
  '/categories/:categoryId/subcategories',
  categoryController.getSubcategoriesByCategory
);
router.post(
  '/categories',
  authMiddleware,
  upload.single('image'),
  categoryController.createCategory
);
router.put(
  '/categories/:id',
  authMiddleware,
  categoryController.updateCategory
);
router.delete(
  '/categories/:id',
  authMiddleware,
  categoryController.deleteCategory
);

// // -------------------- Order Routes --------------------
router.post('/orders', authMiddleware, orderController.createOrder);
router.get('/orders/:id', authMiddleware, orderController.getOrderById);
router.put(
  '/orders/:id/status',
  authMiddleware,
  orderController.updateOrderStatus
);
router.delete('/orders/:id', authMiddleware, orderController.deleteOrder);
router.get('/user/orders', authMiddleware, orderController.getUserOrders);

// -------------------- Cart Routes --------------------
router.get('/cart', authMiddleware, cartController.getCart);
router.post('/cart', authMiddleware, cartController.addToCart);
router.put('/cart/item/:itemId', authMiddleware, cartController.updateCartItem);
router.delete(
  '/cart/item/:itemId',
  authMiddleware,
  cartController.removeCartItem
);
router.post('/cart/coupon', authMiddleware, cartController.applyCoupon);

// // -------------------- Review Routes --------------------
router.post(
  '/review/:productId',
  authMiddleware,
  reviewController.createReview
);
router.get('/review/:productId', reviewController.getProductReviews);
router.delete(
  '/review/:reviewId',
  authMiddleware,
  reviewController.deleteReview
);

router.get('/profile', authMiddleware, userController.getUserProfile);
router.get('/user/orders', authMiddleware, userController.getUserOrders);
router.get('/user/orders/:id', authMiddleware, userController.getUserOrderById);
router.get('/wishlist', authMiddleware, userController.getUserWishlist);
router.post('/wishlist', authMiddleware, userController.toggleWishlist);
module.exports = router;
