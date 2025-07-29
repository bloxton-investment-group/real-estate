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
    const { originalPdfUrl, pageInfo, billId } = body;

    // Validate required fields
    if (!originalPdfUrl || !pageInfo || !billId) {
      return NextResponse.json(
        { error: 'Missing required fields: originalPdfUrl, pageInfo, billId' },
        { status: 400 }
      );
    }

    // Set authentication for Convex client
    const authResult = await auth();
    const token = await authResult.getToken?.({ template: 'convex' });
    if (token) {
      convex.setAuth(token);
    }

    // Call the Convex action for PDF processing
    const result = await convex.action(api.pdfProcessing.processPdfWithRedactions, {
      originalPdfUrl,
      pageInfo,
      billId,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('PDF processing API error:', error);
    
    return NextResponse.json(
      {
        error: 'PDF processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}