import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const AuthCallbackPage = async () => {
    const user = await currentUser();
    
    if (!user?.id || !user.emailAddresses[0].emailAddress) {
        return redirect("/auth/signin");
    }

    // Check if user exists in database
    const existingUser = await db.user.findUnique({
        where: {
            clerkId: user.id,
        },
    });
    
    // If user doesn't exist, create a new record
    if (!existingUser) {
        try {
            await db.user.create({
                data: {
                    id: user.id, // Using Clerk's user ID as the primary ID
                    clerkId: user.id,
                    email: user.emailAddresses[0].emailAddress,
                    name: user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || user.emailAddresses[0].emailAddress.split('@')[0],
                    avatar: user.imageUrl,
                },
            });

            console.log("User created successfully:", user.id);
            // Redirect to dashboard after user creation
            return redirect("/main");
        } catch (error) {
            console.error("Error creating user:", error);
            // Still redirect to avoid leaving user in a broken state
            return redirect("/main");
        }
    }

    // User exists, update their details
    try {
        await db.user.update({
            where: {
                clerkId: user.id,
            },
            data: {
                email: user.emailAddresses[0].emailAddress,
                name: user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.firstName || existingUser.name,
                avatar: user.imageUrl || existingUser.avatar,
                updatedAt: new Date(),
            },
        });

        console.log("User updated successfully:", user.id);
    } catch (error) {
        console.error("Error updating user:", error);
        // Continue to redirect even if update fails
    }

    // Redirect to dashboard after successful authentication
    return redirect("/main");
};

export default AuthCallbackPage
