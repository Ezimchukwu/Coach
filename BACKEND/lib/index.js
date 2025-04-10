/**
 * Utility functions for response formatting
 */

/**
 * Format a successful response
 * @param {any} data - The data to send in the response
 * @param {string} message - Optional success message
 * @returns {Object} Formatted success response
 */
exports.formatSuccess = (data, message = "Success") => ({
    status: "success",
    message,
    data
});

/**
 * Format an error response
 * @param {Error|string} error - The error object or message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} Formatted error response
 */
exports.formatError = (error, statusCode = 500) => ({
    status: "error",
    message: error instanceof Error ? error.message : error,
    statusCode
});
