// utils/validators.js

const validateEmail = (email) => {
  if (!email) return false;

  // Regex for production-level email validation
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Extra checks
  if (!regex.test(email)) return false;
  if (email.includes('..')) return false;
  if (email.startsWith('.') || email.endsWith('.')) return false;

  return true;
};

module.exports = validateEmail;
