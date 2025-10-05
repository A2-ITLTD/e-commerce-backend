const Category = require('../models/categorySchema');
const Product = require('../models/productSchema');
const slugify = require('../utils/slugify');
const { sanitizeInput, deepSanitize } = require('../utils/sanitizeInput');

// @desc    Create new category
// @route   POST /api/categories
// @access  Admin
const createCategory = async (req, res) => {
  try {
    let { name, description, seo, subCategories } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Sanitize inputs
    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : '';

    // Handle uploaded image (via multer)
    const image = req.file
      ? { url: `/uploads/${req.file.filename}`, public_id: '' }
      : { url: '', public_id: '' };

    // Sanitize SEO
    seo = seo
      ? {
          title: sanitizeInput(seo.title || ''),
          description: sanitizeInput(seo.description || ''),
          keywords: sanitizeInput(seo.keywords || ''),
        }
      : {};

    // Handle subCategories
    subCategories = subCategories
      ? JSON.parse(subCategories).map((sub) => ({
          name: sanitizeInput(sub.name),
          slug: slugify(sub.name, { lower: true, strict: true }),
          description: sub.description ? sanitizeInput(sub.description) : '',
          isActive: sub.isActive !== undefined ? sub.isActive : true,
        }))
      : [];

    // Generate slug
    const slug = slugify(name, { lower: true, strict: true });

    // Check for existing category
    const existingCategory = await Category.findOne({
      $or: [{ name }, { slug }],
    });
    if (existingCategory)
      return res.status(400).json({ message: 'Category already exists' });

    // Create category
    const category = new Category({
      name,
      slug,
      description,
      image,
      seo,
      subCategories,
      isActive: true,
    });

    await category.save();

    res
      .status(201)
      .json({ message: 'Category created successfully', category });
  } catch (error) {
    console.error('Create Category Error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Get Categories Error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Get single category by slug or id
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeInput(id);

    const category = await Category.findOne({
      $or: [{ _id: sanitizedId }, { slug: sanitizedId }],
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get products in this category
    const products = await Product.find({ category: category._id })
      .select('title slug price discountPrice mainImage stock')
      .limit(10);

    res.status(200).json({
      category,
      products,
    });
  } catch (error) {
    console.error('Get Category Error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Admin
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    let updateData = { ...req.body };

    // Auto-generate slug for main category
    if (updateData.name) {
      updateData.slug = slugify(updateData.name);
    }

    // Parse subCategories if sent as JSON string
    if (updateData.subCategories) {
      try {
        updateData.subCategories =
          typeof updateData.subCategories === 'string'
            ? JSON.parse(updateData.subCategories)
            : updateData.subCategories;
      } catch (err) {
        console.error('Failed to parse subCategories:', err);
        updateData.subCategories = [];
      }
    }

    // Auto-generate slugs for each subCategory
    if (Array.isArray(updateData.subCategories)) {
      updateData.subCategories = updateData.subCategories.map((sub) => ({
        ...sub,
        slug: sub.name ? slugify(sub.name) : sub.slug || '',
      }));
    }

    // If an image was uploaded
    if (req.file) {
      updateData.image = {
        url: `/uploads/${req.file.filename}`, // or Cloudinary
        public_id: req.file.filename,
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};
// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Admin
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeInput(id);

    // Check if category has products
    const productsCount = await Product.countDocuments({
      category: sanitizedId,
    });
    if (productsCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete category with associated products',
      });
    }

    const category = await Category.findByIdAndDelete(sanitizedId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete Category Error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Get subcategories for a category
// @route   GET /api/categories/:categoryId/subcategories
// @access  Public
// controllers/categoryController.js
const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);

    // STEP 3: Fallback to slug lookup if no valid ObjectId result
    if (!category) {
      category = await Category.findOne(categoryId);
    }

    // STEP 4: If still not found
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // STEP 5: Filter and send only active subcategories
    const activeSubcategories = category.subCategories.filter(
      (subCat) => subCat
    );

    res.json({ subcategories: activeSubcategories });
  } catch (err) {
    console.error('Get Subcategories Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getSubcategoriesByCategory,
};
