import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add product name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add description'],
    },
    price: {
      type: Number,
      required: [true, 'Please add price'],
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, 'Please add stock count'],
      min: 0,
      default: 0,
    },
    image: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Product', productSchema);