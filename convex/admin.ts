import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Temporary function to upgrade a user to admin (for testing)
export const makeUserAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      role: "admin",
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

// Debug function to check specific bill details
export const debugSpecificBill = mutation({
  args: {},
  handler: async (ctx, args) => {
    const billId = "k97409m2axgqer11traxmffwgh7mk6j8";
    console.log(`Getting details for bill: ${billId}`);
    
    // Query from utilityBills table specifically
    const bill = await ctx.db
      .query("utilityBills")
      .filter((q) => q.eq(q.field("_id"), billId as Id<"utilityBills">))
      .first();
    
    if (!bill) {
      console.log("Bill not found!");
      return { error: "Bill not found" };
    }
    
    console.log("Bill details:");
    console.log(`- ID: ${bill._id}`);
    console.log(`- Property: ${bill.propertyId}`);
    console.log(`- Original PDF: ${bill.billPdfUrl}`);
    console.log(`- Redacted PDF: ${bill.summaryPageUrl || 'NONE'}`);
    console.log(`- Page Info: ${JSON.stringify(bill.pageInfo, null, 2)}`);
    console.log(`- Has page info: ${!!bill.pageInfo}`);
    console.log(`- Page info length: ${bill.pageInfo ? bill.pageInfo.length : 0}`);
    
    return {
      id: bill._id,
      propertyId: bill.propertyId,
      originalPdfUrl: bill.billPdfUrl,
      redactedPdfUrl: bill.summaryPageUrl,
      hasPageInfo: !!bill.pageInfo,
      pageInfo: bill.pageInfo,
      extractedData: bill.extractedData,
      billNotes: bill.billNotes
    };
  },
});

// Debug function to check bills
export const debugBills = mutation({
  args: {},
  handler: async (ctx, args) => {
    console.log("Getting all utility bills...");
    
    const bills = await ctx.db.query("utilityBills").collect();
    
    console.log(`Found ${bills.length} bills:`);
    bills.forEach(bill => {
      console.log(`- Bill ID: ${bill._id}, Property: ${bill.propertyId}, Created: ${new Date(bill.createdAt).toISOString()}`);
    });
    
    return bills.map(bill => ({
      id: bill._id,
      propertyId: bill.propertyId,
      createdAt: bill.createdAt,
      hasRedacted: !!bill.summaryPageUrl,
      originalUrl: bill.billPdfUrl
    }));
  },
});

// Fix bills with storage IDs instead of URLs
export const fixStorageUrls = mutation({
  args: {},
  handler: async (ctx, args) => {
    console.log("Fixing storage URLs...");
    
    const bills = await ctx.db.query("utilityBills").collect();
    let fixedCount = 0;
    
    for (const bill of bills) {
      // Check if summaryPageUrl looks like a storage ID (not a URL)
      if (bill.summaryPageUrl && !bill.summaryPageUrl.startsWith('http')) {
        console.log(`Bill ${bill._id} has storage ID: ${bill.summaryPageUrl}`);
        
        try {
          // Get the proper URL from the storage ID
          const properUrl = await ctx.storage.getUrl(bill.summaryPageUrl as any);
          
          if (properUrl) {
            await ctx.db.patch(bill._id, {
              summaryPageUrl: properUrl,
            });
            fixedCount++;
            console.log(`Fixed URL for bill ${bill._id}: ${properUrl}`);
          } else {
            // If we can't get URL, clear the field
            await ctx.db.patch(bill._id, {
              summaryPageUrl: undefined,
            });
            console.log(`Cleared invalid storage ID for bill ${bill._id}`);
          }
        } catch (error) {
          console.error(`Error fixing bill ${bill._id}:`, error);
          // Clear invalid storage ID
          await ctx.db.patch(bill._id, {
            summaryPageUrl: undefined,
          });
        }
      }
    }
    
    console.log(`Fixed ${fixedCount} bills`);
    return { success: true, fixedCount };
  },
});

// Temporary function to fix data types and field names
export const fixDataMigration = mutation({
  args: {},
  handler: async (ctx, args) => {
    console.log("Starting migration to fix data types and field names...");
    
    // Get all utility bills
    const bills = await ctx.db.query("utilityBills").collect();
    
    let updatedCount = 0;
    
    for (const bill of bills) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Fix extractedData types
      if (bill.extractedData) {
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
          updates.extractedData = updatedExtractedData;
        }
      }
      
      // Migrate invoiceNotes to billNotes if present
      if ((bill as any).invoiceNotes !== undefined && !bill.billNotes) {
        updates.billNotes = (bill as any).invoiceNotes;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ctx.db.patch(bill._id, updates);
        updatedCount++;
        console.log(`Updated bill ${bill._id}: migrated data types and field names`);
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} utility bills.`);
    return { success: true, updatedCount };
  },
});