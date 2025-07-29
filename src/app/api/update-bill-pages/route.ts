import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { billId, pageInfo } = body;

    // Validate required fields
    if (!billId || !pageInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: billId, pageInfo' },
        { status: 400 }
      );
    }

    // Set authentication for Convex client
    const authResult = await auth();
    const token = await authResult.getToken?.({ template: 'convex' });
    if (token) {
      convex.setAuth(token);
    }

    // Call the Convex mutation to update page info
    await convex.mutation(api.documents.updateUtilityBillPageInfo, {
      billId,
      pageInfo,
    });

    return NextResponse.json({
      success: true,
      message: 'Page info updated successfully',
    });
  } catch (error) {
    console.error('Update bill pages API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update page info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}