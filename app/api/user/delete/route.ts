import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server'; // Use server SDK

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request) {
  try {
    const { userId } =  await auth(); // Get userId from the session

    if (!userId) {
      console.error("[API User Delete] Unauthorized: No user ID found.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API User Delete] Attempting to delete user: ${userId}`);

    // Use Clerk backend SDK to delete the user
    await clerkClient.users.deleteUser(userId);

    console.log(`[API User Delete] Successfully deleted user: ${userId}`);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error(`[API User Delete] Error deleting user:`, error);

    // Provide a more specific error message if possible
    const errorMessage = error.errors?.[0]?.message || error.message || 'Failed to delete user account.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 