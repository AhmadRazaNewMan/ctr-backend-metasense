/**
 * Converts snake_case keys to Human Readable format.
 * Example: 'company_name' becomes 'Company Name'
 */
const formatExportKey = (key) => {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Sanitizes and maps the data keys according to the specified logic
 * @param {Array} data - The input data to be sanitized
 * @returns {Array} - The sanitized data
 */
module.exports.sanitizeExportJSONData = (data) => {
  return data.map((item) => {
    const sanitizedItem = {};
    for (const key in item) {
      const formattedKey = formatExportKey(key);
      sanitizedItem[formattedKey] = item[key] === null ? "-" : item[key];
    }
    return sanitizedItem;
  });
};
