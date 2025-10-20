import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt, { Secret } from "jsonwebtoken";
import { cookies } from "next/headers"; // <-- IMPORTANT

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedRoutes = ["/dashboard", "/cart", "/orders"];

  // Skip non-protected routes
  if (!protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Read cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    jwt.verify(token, process.env.JWT_ACCESS_SECRET! as Secret);
    return NextResponse.next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/cart/:path*", "/orders/:path*"],
};
