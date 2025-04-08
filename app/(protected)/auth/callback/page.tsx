// pages/api/auth/callback.ts or app/auth/callback/page.tsx

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import crypto from "crypto";

const AuthCallbackPage = async () => {
    const user = await currentUser();

    // Add more robust check for email verification if needed
    if (!user?.id || !user.emailAddresses?.[0]?.emailAddress) {
        console.warn("Auth callback: Missing user ID or primary email.");
        // Redirect to sign-in or an error page
        return redirect("/auth/signin?error=missing_data");
    }

    const userEmail = user.emailAddresses[0].emailAddress;

    // Check if user exists in database
    const existingUser = await db.user.findUnique({
        where: {
            clerkId: user.id,
        },
    });

    // If user doesn't exist, create a new record
    if (!existingUser) {
        try {
            console.log(`Auth callback: Creating user for Clerk ID: ${user.id}`);
            await db.user.create({
                data: {
                    id: crypto.randomUUID(), // Generate a unique ID using UUID
                    clerkId: user.id,
                    email: userEmail,
                    name: user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || userEmail.split('@')[0], // Fallback to email prefix
                    avatar: user.imageUrl,
                    // createdAt/updatedAt are handled by Prisma defaults
                },
            });

            console.log("Auth callback: User created successfully:", user.id);
        } catch (error) {
            console.error("Auth callback: Error creating user:", error);
            // Consider redirecting to an error page or retrying?
            // For now, redirect to main, but be aware the DB record might be missing.
            return redirect("/main?error=creation_failed");
        }
    }
    // Else: User already exists, update their details (optional but good practice)
    else {
        try {
            console.log(`Auth callback: Updating user for Clerk ID: ${user.id}`);
            await db.user.update({
                where: {
                    clerkId: user.id,
                },
                data: {
                    email: userEmail, // Update email in case it changed
                    name: user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || existingUser.name, // Use existing name as fallback
                    avatar: user.imageUrl || existingUser.avatar, // Use existing avatar as fallback
                    // updatedAt is handled by Prisma @updatedAt
                },
            });
            console.log("Auth callback: User updated successfully:", user.id);
        } catch (error) {
             console.error("Auth callback: Error updating user:", error);
             // Non-critical error, proceed with redirect
        }
    }

    // Redirect to the main application area after sync
    return redirect("/main");
};

export default AuthCallbackPage;