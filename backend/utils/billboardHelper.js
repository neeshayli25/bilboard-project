import mongoose from 'mongoose';
import Billboard from '../models/Billboard.js';

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isValidObjectId = (value = '') => {
  const id = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
};

export const buildBillboardIdOrNameFilter = (value = '') => {
  const idOrName = String(value || '').trim();
  if (!idOrName) return null;

  if (isValidObjectId(idOrName)) {
    return { _id: idOrName };
  }

  return { name: new RegExp(`^${escapeRegExp(idOrName)}$`, 'i') };
};

export const getBillboardByIdOrName = async (idOrName, options = {}) => {
  const filter = buildBillboardIdOrNameFilter(idOrName);
  if (!filter) return null;

  let query = Billboard.findOne(filter);

  if (options.select) {
    query = query.select(options.select);
  }

  const populateList = Array.isArray(options.populate)
    ? options.populate
    : options.populate
      ? [options.populate]
      : [];

  populateList.forEach((populateConfig) => {
    query = query.populate(populateConfig);
  });

  if (options.lean) {
    query = query.lean();
  }

  return query;
};
