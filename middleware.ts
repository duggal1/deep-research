import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define route matchers for different types of routes
const isPublicRoute = createRouteMatcher(["/", "/marketing(.*)"]);
const isProtectedRoute = createRouteMatcher([
    "/main(.*)",
    "/app(.*)",
    "/api/(.*)", // Protect all API routes
    "/settings(.*)" // Also explicitly protect settings if needed
]);
const isAuthRoute = createRouteMatcher(["/auth(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Get user ID from auth state
  const { userId } = await auth();

  // 1. Handle Auth Routes (Redirect logged-in users away)
  if (isAuthRoute(req)) {
    if (userId) {
      // If user is logged in and tries to access auth pages, redirect to main
      return NextResponse.redirect(new URL("/main", req.url));
    }
    // If user is not logged in, allow access to auth pages (e.g., sign-in)
    return NextResponse.next();
  }

  // 2. Handle Protected Routes (Requires Authentication)
  if (isProtectedRoute(req)) {
    // If the route is protected and there's no user ID, redirect to sign-in
    if (!userId) {
      // Redirect unauthenticated users trying to access protected routes
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("redirect_url", req.url); // Optional: Add redirect URL
      return NextResponse.redirect(signInUrl);
    }
    // If user is logged in, allow access to protected route
     return NextResponse.next();
  }

  // 3. Handle Public Routes (Allow everyone)
  // This check is technically redundant if previous checks cover everything,
  // but can be kept for explicitness. If a route is not auth and not protected,
  // it's implicitly public here based on the logic flow.
  // if (isPublicRoute(req)) {
  //   return NextResponse.next();
  // }

  // Default: Allow the request to proceed if none of the above conditions met
  // (This generally covers public routes now implicitly)
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and _next internal files
    "/((?!.*\\..*|_next).*)",
    // Explicitly include the root route '/' which might be missed by the negative lookahead
    "/",
    // Ensure API and TRPC routes are included
    "/(api|trpc)(.*)"
  ],
};



// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";

// // Define route matchers for different types of routes
// const isPublicRoute = createRouteMatcher(["/", "/marketing(.*)"]);
// const isProtectedRoute = createRouteMatcher([
//     "/main(.*)",

//  // Protect all API routes
//     "/settings(.*)" // Also explicitly protect settings if needed
// ]);
// const isAuthRoute = createRouteMatcher(["/auth(.*)"]);

// export default clerkMiddleware(async (auth, req) => {
//   // Get user ID from auth state
//   const { userId } = await auth();

//   // 1. Handle Auth Routes (Redirect logged-in users away)
//   if (isAuthRoute(req)) {
//     if (userId) {
//       // If user is logged in and tries to access auth pages, redirect to main
//       return NextResponse.redirect(new URL("/main", req.url));
//     }
//     // If user is not logged in, allow access to auth pages (e.g., sign-in)
//     return NextResponse.next();
//   }

//   // 2. Handle Protected Routes (Requires Authentication)
//   if (isProtectedRoute(req)) {
//     // If the route is protected and there's no user ID, redirect to sign-in
//     if (!userId) {
//       // Redirect unauthenticated users trying to access protected routes
//       const signInUrl = new URL("/auth/signin", req.url);
//       signInUrl.searchParams.set("redirect_url", req.url); // Optional: Add redirect URL
//       return NextResponse.redirect(signInUrl);
//     }
//     // If user is logged in, allow access to protected route
//      return NextResponse.next();
//   }

//   // 3. Handle Public Routes (Allow everyone)
//   // This check is technically redundant if previous checks cover everything,
//   // but can be kept for explicitness. If a route is not auth and not protected,
//   // it's implicitly public here based on the logic flow.
//   // if (isPublicRoute(req)) {
//   //   return NextResponse.next();
//   // }

//   // Default: Allow the request to proceed if none of the above conditions met
//   // (This generally covers public routes now implicitly)
//   return NextResponse.next();
// });

// export const config = {
//   matcher: [
//     // Match all routes except static files and _next internal files
//     "/((?!.*\\..*|_next).*)",
//     // Explicitly include the root route '/' which might be missed by the negative lookahead
//     "/",
//     // Ensure API and TRPC routes are included
   
//   ],
// };


