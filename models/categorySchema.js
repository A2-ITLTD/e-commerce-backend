const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    image: {
      url: { type: String, required: true },
      public_id: String,
    },
    seo: {
      title: {
        type: String,
      },
      description: {
        type: String,
      },
      keywords: {
        type: String,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subCategories: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        slug: {
          type: String,
          required: true,
          lowercase: true,
        },
        description: {
          type: String,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Category', categorySchema);
