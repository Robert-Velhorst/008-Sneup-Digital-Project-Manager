const mongoose = require('mongoose');

// Public single-value filters must never become MongoDB operator documents or
// Mongoose's implicit array-to-$in queries. Leave string content unchanged.
const scalarQueryString = (value) => {
  if (typeof value === 'string') return value;
  const error = new TypeError('Query filter must be a single string');
  error.statusCode = 400;
  throw error;
};

// Internal callers may pass a genuine ObjectId; its canonical string has the
// same database identity without carrying an object into the filter boundary.
const scalarQueryId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return scalarQueryString(value.toHexString());
  return scalarQueryString(value);
};

module.exports = { scalarQueryString, scalarQueryId };
