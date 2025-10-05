const Product = require('../models/productSchema');
const slugify = require('../utils/slugify');
const { sanitizeInput, deepSanitize } = require('../utils/sanitizeInput');
const categorySchema = require('../models/categorySchema');

// @desc    Create new product
// @route   POST /api/products
// @access  Admin
const createProduct = async (req, res) => {
  try {
    let {
      title,
      sku,
      description,
      price,
      discountPrice,
      stock,
      category,
      subCategory,
      brand,
      tags,
      status,
      seo,
      specs,
      isFeatured,
    } = req.body;

    // Initialize errors object
    const errors = {};

    // Validate required fields
    if (!title) errors.title = 'Product title is required';
    if (!sku) errors.sku = 'SKU is required';
    if (!description) errors.description = 'Product description is required';
    if (!price) errors.price = 'Price is required';
    if (!stock) errors.stock = 'Stock quantity is required';
    if (!category) errors.category = 'Category is required';

    // Validate description length
    if (description && description.length < 20) {
      errors.description = 'Description must be at least 20 characters long';
    }

    // Convert numeric fields
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    const numericDiscount = discountPrice ? Number(discountPrice) : 0;

    if (price && isNaN(numericPrice))
      errors.price = 'Price must be a valid number';
    if (stock && isNaN(numericStock))
      errors.stock = 'Stock must be a valid number';
    if (discountPrice && isNaN(numericDiscount))
      errors.discountPrice = 'Discount price must be a valid number';

    if (price && numericPrice < 0) errors.price = 'Price cannot be negative';
    if (stock && numericStock < 0) errors.stock = 'Stock cannot be negative';
    if (discountPrice && numericDiscount < 0)
      errors.discountPrice = 'Discount price cannot be negative';

    if (discountPrice && numericDiscount >= numericPrice) {
      errors.discountPrice = 'Discount price must be less than regular price';
    }

    // Validate images
    if (!req.files?.mainImage) {
      errors.mainImage = 'Main product image is required';
    }

    // If validation errors exist
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    // Sanitize inputs
    title = sanitizeInput(title);
    sku = sanitizeInput(sku);
    description = sanitizeInput(description);
    category = sanitizeInput(category);
    subCategory = subCategory ? sanitizeInput(subCategory) : undefined;
    brand = brand ? sanitizeInput(brand) : undefined;
    tags = tags ? tags.split(',').map((tag) => sanitizeInput(tag.trim())) : [];
    seo = seo ? deepSanitize(seo) : {};
    specs = specs ? deepSanitize(specs) : {};
    isFeatured = Boolean(isFeatured);

    // Check unique SKU
    const existingSku = await Product.findOne({ sku });
    if (existingSku) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: { sku: 'SKU already exists' },
      });
    }

    // Check if category exists
    const categoryExists = await categorySchema.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: { category: 'Category does not exist' },
      });
    }

    // Validate subcategory if provided
    let validSubCategory = null;
    if (subCategory) {
      // Find the subcategory within the category
      const foundSubCategory = categoryExists.subCategories.find(
        (subCat) =>
          subCat._id.toString() === subCategory || subCat.slug === subCategory
      );

      if (!foundSubCategory) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: {
            subCategory: 'Subcategory does not exist in this category',
          },
        });
      }

      validSubCategory = foundSubCategory._id;
    }

    // Handle images
    const mainImage = { url: `/uploads/${req.files.mainImage[0].filename}` };
    const subImages = req.files?.subImages
      ? req.files.subImages.map((file) => ({
          url: `/uploads/${file.filename}`,
        }))
      : [];

    // Generate slug
    const slug = slugify(title, { lower: true, strict: true });

    // Create product
    const product = new Product({
      title,
      slug,
      sku,
      description,
      price: numericPrice,
      discountPrice: numericDiscount,
      stock: numericStock,
      category,
      subCategory: validSubCategory,
      brand,
      tags,
      status: status || 'active',
      seo,
      specs,
      mainImage,
      subImages,
      isFeatured,
    });

    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Create Product Error:', error.message);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: { sku: 'SKU already exists' },
      });
    }

    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
// @desc    Get all products with pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    // Extract page and limit from query params (default: page=1, limit=10)
    let { page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    // Count total products for pagination metadata
    const totalProducts = await Product.countDocuments();

    const products = await Product.find()
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      page,
      limit,
      totalPages,
      totalProducts,
      products,
    });
  } catch (error) {
    console.error('Get Products Error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
// @desc    Get single product (by ID or slug)
// @route   GET /api/products/:identifier
// @access  Public
const getProduct = async (req, res) => {
  const { slug } = req.params;
  const sanitizedSlug = sanitizeInput(slug);

  const product = await Product.findOne({ slug: sanitizedSlug }).populate(
    'category',
    'name slug'
  );

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.status(200).json({ product });
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeInput(id);

    let updates = deepSanitize(req.body);

    // Handle images
    if (req.files?.mainImage) {
      updates.mainImage = {
        url: `/uploads/${req.files.mainImage[0].filename}`,
      };
    } else if (req.body.keepExistingMainImage === 'false') {
      updates.mainImage = null;
    }

    if (req.files?.subImages) {
      updates.subImages = req.files.subImages.map((file) => ({
        url: `/uploads/${file.filename}`,
      }));
    }

    // Handle tags
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map((tag) => tag.trim());
    }

    // Convert numeric fields
    if (updates.price) updates.price = Number(updates.price);
    if (updates.discountPrice)
      updates.discountPrice = Number(updates.discountPrice);
    if (updates.stock) updates.stock = Number(updates.stock);

    // Handle specs
    if (updates.specs) {
      updates.specs = deepSanitize(updates.specs);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      sanitizedId,
      updates,
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Update Product Error:', error.message);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: { sku: 'SKU already exists' },
      });
    }

    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeInput(id);

    const product = await Product.findByIdAndDelete(sanitizedId);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete Product Error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

const getProductsBySubcategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;

    if (!subCategoryId) {
      return res.status(400).json({ message: 'Subcategory ID is required' });
    }

    const products = await Product.find({
      subCategory: subCategoryId,
    }).populate('subCategory');

    if (!products.length) {
      return res
        .status(404)
        .json({ message: 'No products found for this subcategory' });
    }

    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products by subcategory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsBySubcategory,
};
