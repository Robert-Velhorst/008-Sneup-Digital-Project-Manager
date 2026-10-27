const mongoose = require('mongoose');

const invalidReference = (name) => {
  const error = new Error(`${name} must be a single identifier`);
  error.code = 'SNEUP_INVALID_REFERENCE';
  error.statusCode = 400;
  return error;
};

const optionalModelReference = (value, name = 'reference') => {
  if (value === undefined || value === null || value === '') return value;
  if (typeof value === 'string' || value instanceof mongoose.Types.ObjectId) return value;

  // BSON IDs can come from another installed driver copy. Canonicalize their
  // hex value instead of forwarding an unfamiliar object as a query selector.
  if (value && typeof value.toHexString === 'function') {
    const hex = value.toHexString();
    if (typeof hex === 'string' && /^[a-f\d]{24}$/i.test(hex)) {
      return new mongoose.Types.ObjectId(hex);
    }
  }

  throw invalidReference(name);
};

const requiredModelReference = (value, name = 'reference') => {
  const reference = optionalModelReference(value, name);
  if (reference === undefined || reference === null || reference === '') throw invalidReference(name);
  return reference;
};

module.exports = { optionalModelReference, requiredModelReference };
