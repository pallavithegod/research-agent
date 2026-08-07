import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/signin(.*)", "/signup(.*)"]);
const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const hasClerkConfig = authEnabled && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const protectedMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default hasClerkConfig ? protectedMiddleware : function middleware() {
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ico|woff2?|ttf|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
