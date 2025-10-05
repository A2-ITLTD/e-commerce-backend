const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    coupon: {
      code: String,
      discount: {
        type: Number,
        min: 0,
      },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Calculate totals before saving
cartSchema.pre('save', function (next) {
  this.calculateTotals();
  next();
});

// Instance method to calculate cart totals
cartSchema.methods.calculateTotals = function () {
  let total = 0;
  let discountTotal = 0;

  this.items.forEach((item) => {
    const itemPrice = item.discountPrice || item.price;
    const itemTotal = itemPrice * item.quantity;
    total += item.price * item.quantity;
    discountTotal += itemTotal;
  });

  // Apply coupon discount if exists
  let couponDiscount = 0;
  if (this.coupon && this.coupon.code) {
    if (this.coupon.discountType === 'percentage') {
      couponDiscount = discountTotal * (this.coupon.discount / 100);
    } else {
      couponDiscount = Math.min(this.coupon.discount, discountTotal);
    }
  }

  this.total = total;
  this.discountTotal = discountTotal;
  this.grandTotal = Math.max(0, discountTotal - couponDiscount);
};

// Virtual for item count
cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);
