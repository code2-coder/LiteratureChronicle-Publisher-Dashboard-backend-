/**
 * Calculate royalty for a sale
 * @param {number} mrp - Maximum Retail Price
 * @param {number} commissionPercentage - Platform commission percentage (e.g., 15 for 15%)
 * @param {number} printingCost - Cost to print the book
 * @param {number} quantity - Number of books sold
 * @param {string} type - 'ebook' or 'physical'
 * @returns {number} - Calculated royalty
 */
export const calculateRoyalty = (mrp, commissionPercentage, printingCost, quantity = 1, type = 'physical') => {
  const mrpVal = parseFloat(mrp) || 0;
  const commVal = parseFloat(commissionPercentage) || 0;
  const printCostVal = parseFloat(printingCost) || 0;
  const qtyVal = parseInt(quantity) || 1;

  // Platform Commission = MRP * (Commission % / 100)
  const platformCommissionValue = mrpVal * (commVal / 100);

  let royaltyPerUnit = 0;

  if (type === 'ebook') {
    // eBook Profit = MRP - Platform Commission
    royaltyPerUnit = mrpVal - platformCommissionValue;
  } else {
    // Physical Book Profit = MRP - Platform Commission - Printing Cost
    royaltyPerUnit = mrpVal - platformCommissionValue - printCostVal;
  }

  // Ensure royalty is not negative
  const totalRoyalty = Math.max(0, royaltyPerUnit * qtyVal);
  
  // Return rounded to 2 decimal places
  return Math.round(totalRoyalty * 100) / 100;
};
