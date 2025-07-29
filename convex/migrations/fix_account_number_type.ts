import { internalMutation } from "../_generated/server";

export const fixAccountNumberType = internalMutation({
  handler: async (ctx) => {
    console.log("Starting migration to fix account_number and meter_number types...");
    
    // Get all utility bills
    const bills = await ctx.db.query("utilityBills").collect();
    
    let updatedCount = 0;
    
    for (const bill of bills) {
      if (bill.extractedData) {
        let needsUpdate = false;
        const updatedExtractedData = { ...bill.extractedData };
        
        // Convert account_number from number to string if needed
        if (typeof updatedExtractedData.account_number === "number") {
          updatedExtractedData.account_number = updatedExtractedData.account_number.toString();
          needsUpdate = true;
        }
        
        // Convert meter_number from number to string if needed
        if (typeof updatedExtractedData.meter_number === "number") {
          updatedExtractedData.meter_number = updatedExtractedData.meter_number.toString();
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await ctx.db.patch(bill._id, {
            extractedData: updatedExtractedData,
          });
          updatedCount++;
          console.log(`Updated bill ${bill._id}: account_number and/or meter_number converted to string`);
        }
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} utility bills.`);
    return { success: true, updatedCount };
  },
});