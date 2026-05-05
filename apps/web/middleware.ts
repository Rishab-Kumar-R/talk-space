import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isChat = request.nextUrl.pathname.startsWith("/chat");
  const isLogin = request.nextUrl.pathname === "/login";

  // TEMP: comment out to bypass login for UI preview — uncomment before deploying
  // if (isChat && !token) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }
  if (isLogin && token) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/login"],
};
