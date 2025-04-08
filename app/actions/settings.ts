'use server';

import { db } from '@/lib/db';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

interface UpdateProfileData {
  name?: string;
  avatarUrl?: string;
}

export async function updateUserProfile(data: UpdateProfileData) {
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { name, avatarUrl } = data;
  const dataToUpdate: { name?: string; avatar?: string } = {};
  const clerkDataToUpdate: { firstName?: string; imageUrl?: string } = {};

  let nameToUpdate = name?.trim();
  if (nameToUpdate && nameToUpdate.length > 0) {
    dataToUpdate.name = nameToUpdate;
    // Assuming name is just the first name for Clerk for simplicity,
    // adjust if you store full name differently in Clerk
    clerkDataToUpdate.firstName = nameToUpdate.split(' ')[0] || nameToUpdate;
  }

  if (avatarUrl) {
    dataToUpdate.avatar = avatarUrl;
    clerkDataToUpdate.imageUrl = avatarUrl;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return { success: false, error: 'No changes provided' };
  }

  try {
    // 1. Update your database
    const updatedDbUser = await db.user.update({
      where: { clerkId: user.id },
      data: dataToUpdate,
    });

    // 2. Update Clerk user metadata (optional but recommended for consistency)
    // Only update Clerk if there are relevant fields
    if (Object.keys(clerkDataToUpdate).length > 0) {
         const clerk = await clerkClient();
         await clerk.users.updateUser(user.id, clerkDataToUpdate);
         console.log("Clerk user updated successfully");
    }

    // 3. Revalidate the settings path to ensure fresh data is shown
    revalidatePath('/settings');

    return { success: true, user: updatedDbUser };

  } catch (error) {
    console.error('Error updating user profile:', error);
    // Provide a more specific error message if possible
    let errorMessage = 'Failed to update profile.';
    if (error instanceof Error) {
         // Check for specific Prisma or Clerk errors if needed
         errorMessage = `Failed to update profile: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}