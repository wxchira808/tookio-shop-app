/**
 * Currency formatting utility for Tookio Shop
 * Formats all amounts in Kenyan Shillings (KSH)
 */

/**
 * Format amount as Kenyan Shillings (KSH)
 * @param {number|string} amount - The amount to format
 * @param {boolean} showDecimals - Whether to show decimal places (default: true)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, showDecimals = true) {
  const numAmount = parseFloat(amount) || 0;

  if (showDecimals) {
    return `KSH ${numAmount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `KSH ${Math.round(numAmount).toLocaleString('en-KE')}`;
}

/**
 * Format amount as compact Kenyan Shillings (e.g., KSH 1.5K, KSH 2.3M)
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted compact currency string
 */
export function formatCompactCurrency(amount) {
  const numAmount = parseFloat(amount) || 0;

  if (numAmount >= 1000000) {
    return `KSH ${(numAmount / 1000000).toFixed(1)}M`;
  } else if (numAmount >= 1000) {
    return `KSH ${(numAmount / 1000).toFixed(1)}K`;
  }

  return `KSH ${numAmount.toFixed(0)}`;
}
