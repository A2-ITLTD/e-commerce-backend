const sanitizeHtml = require('sanitize-html');

// Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

// Recursive sanitization for objects and arrays
const deepSanitize = (data) => {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  } else if (Array.isArray(data)) {
    return data.map((item) => deepSanitize(item));
  } else if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = deepSanitize(data[key]);
    }
    return sanitized;
  }
  return data;
};

module.exports = { sanitizeInput, deepSanitize };
