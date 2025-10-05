const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    brand: {
      type: String,
      trim: true,
    },
    mainImage: {
      url: { type: String, required: true },
      public_id: String,
    },

    // ✅ Up to 4 sub-images
    subImages: [
      {
        url: { type: String, required: true },
        public_id: String,
      },
    ],

    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },

    seo: {
      title: { type: String, maxlength: 60 },
      metaDescription: { type: String },
      keywords: [String],
    },

    // ✅ Product Specifications
    specs: {
      modelName: { type: String, trim: true },
      brand: { type: String, trim: true },
      color: { type: String, trim: true },
      productGrade: { type: String, trim: true },
      dimensions: { type: String, trim: true },
      itemWeight: { type: String, trim: true },
      material: { type: String, trim: true },
      maxSpeed: { type: String, trim: true },
      specialFeatures: [{ type: String, trim: true }],
      targetAudience: { type: String, trim: true },
      maxHorsepower: { type: String, trim: true },
      powerSource: { type: String, trim: true },
      recommendedUses: [{ type: String, trim: true }],
      resistanceMechanism: { type: String, trim: true },
      maxWeightRecommendation: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

// Index for faster product search
productSchema.index({ title: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
