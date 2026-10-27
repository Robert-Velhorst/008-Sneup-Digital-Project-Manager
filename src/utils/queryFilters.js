// Nested query objects and repeated-parameter arrays are not scalar Mongo filters.
const optionalQueryString = (value, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    const error = new Error(`${name} must be a single string`);
    error.code = 'SNEUP_SCALAR_QUERY_REQUIRED';
    error.statusCode = 400;
    throw error;
  }
  return value;
};

module.exports = { optionalQueryString };
