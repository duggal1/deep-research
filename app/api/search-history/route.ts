import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/search-history - Fetch user's search history
export async function GET(request: Request) {
  const { userId: clerkUserId } =  await auth(); // Rename to avoid confusion

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch history using the Clerk User ID directly if your User model `id` is the Clerk ID
    // If your User model `id` is different, you might need to find the user first
    const history = await prisma.searchHistory.findMany({
      where: { userId: clerkUserId }, // Assuming User.id maps directly to Clerk's userId
      orderBy: { createdAt: 'desc' },
      take: 15, // Limit the number of history items fetched
      select: {
        id: true,
        query: true,
        createdAt: true,
      },
    });
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json({ error: 'Failed to fetch search history' }, { status: 500 });
  }
}

// POST /api/search-history - Add a new search query
export async function POST(request: Request) {
  const { userId: clerkUserId } =  await auth(); // Rename to avoid confusion

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid query provided' }, { status: 400 });
    }

    // --- FIX START: Check if user exists in DB before creating history ---
    const userExists = await prisma.user.findUnique({
      where: { id: clerkUserId }, // Check using the ID field that corresponds to Clerk's userId
    });

    if (!userExists) {
      console.warn(`[Search History] User with Clerk ID ${clerkUserId} not found in DB. Skipping history save.`);
      // Return a success status but indicate the skip, or choose to return an error
      return NextResponse.json({ message: 'User not found in DB, history not saved' }, { status: 200 }); // Or 404 maybe? 200 avoids client error.
    }
    // --- FIX END ---


    const newEntry = await prisma.searchHistory.create({
      data: {
        query: query.trim(),
        userId: clerkUserId, // Use the verified Clerk User ID
      },
      select: { // Select only necessary fields for the response
        id: true,
        query: true,
        createdAt: true,
      }
    });
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    // Check if the error is the specific foreign key constraint violation
    if (error instanceof Error && (error as any).code === 'P2003') {
       console.warn(`[Search History] Foreign key constraint failed for user ${clerkUserId}. User might not exist in DB yet.`);
       return NextResponse.json({ error: 'Failed to save history: User record not found or constraint violation.' }, { status: 409 }); // Conflict or Bad Request
    }
    console.error('Error saving search history:', error);
    return NextResponse.json({ error: 'Failed to save search history' }, { status: 500 });
  }
}

// DELETE /api/search-history - Clear user's search history
export async function DELETE(request: Request) {
  const { userId: clerkUserId } =  await auth(); // Rename to avoid confusion

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.searchHistory.deleteMany({
      where: { userId: clerkUserId }, // Use the Clerk User ID
    });
    return NextResponse.json({ message: 'Search history cleared' }, { status: 200 });
  } catch (error) {
    console.error('Error clearing search history:', error);
    return NextResponse.json({ error: 'Failed to clear search history' }, { status: 500 });
  }
} 