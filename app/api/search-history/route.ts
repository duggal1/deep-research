import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/search-history - Fetch user's search history
export async function GET(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const history = await prisma.searchHistory.findMany({
      where: { userId },
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
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid query provided' }, { status: 400 });
    }

    // Avoid saving duplicates consecutively (optional)
    // const lastEntry = await prisma.searchHistory.findFirst({
    //   where: { userId },
    //   orderBy: { createdAt: 'desc' },
    // });
    // if (lastEntry?.query === query.trim()) {
    //   return NextResponse.json({ message: 'Query already last in history' }, { status: 200 });
    // }

    const newEntry = await prisma.searchHistory.create({
      data: {
        query: query.trim(),
        userId: userId,
      },
      select: { // Select only necessary fields for the response
        id: true,
        query: true,
        createdAt: true,
      }
    });
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error saving search history:', error);
    return NextResponse.json({ error: 'Failed to save search history' }, { status: 500 });
  }
}

// DELETE /api/search-history - Clear user's search history
export async function DELETE(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.searchHistory.deleteMany({
      where: { userId },
    });
    return NextResponse.json({ message: 'Search history cleared' }, { status: 200 });
  } catch (error) {
    console.error('Error clearing search history:', error);
    return NextResponse.json({ error: 'Failed to clear search history' }, { status: 500 });
  }
} 