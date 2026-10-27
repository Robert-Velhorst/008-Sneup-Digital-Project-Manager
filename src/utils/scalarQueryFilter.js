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
  if (typeof value === 'string') return value;
  // Demo observability intentionally loads without the database runtime.
  // Resolve ObjectId support only when a live query supplies an object value.
  if (value instanceof require('mongoose').Types.ObjectId) return scalarQueryString(value.toHexString());
  return scalarQueryString(value);
};

module.exports = { scalarQueryString, scalarQueryId };
