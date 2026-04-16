import Product from '../models/Product.js';

// @desc    Get all products (with pagination)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;

  const total = await Product.countDocuments();
  const products = await Product.find().limit(limit).skip(startIndex);

  res.json({
    products,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

// @desc    Create a product (admin only)
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  const { name, description, price, stock } = req.body;
  const product = await Product.create({
    name,
    description,
    price,
    stock,
  });
  res.status(201).json(product);
};

// @desc    Update a product (admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.price = req.body.price || product.price;
    product.stock = req.body.stock || product.stock;
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

// @desc    Delete a product (admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};