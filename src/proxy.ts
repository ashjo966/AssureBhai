import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Common exploit scanner probe patterns (PHP RCEs, CGI scripts, WordPress exploits, sensitive dot-files)
const BLOCKED_PATH_PATTERNS = [
  /\.(php|phtml|php5|php7|php8|cgi|asp|aspx|jsp|env|git|bak|sql)$/i,
  /^\/(wp-admin|wp-content|wp-includes|xmlrpc\.php)/i,
  /^\/(cgi-bin|vendor\/phpunit|shell|eval-stdin)/i,
  /^\/\.env/i,
  /^\/\.git/i,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Immediately drop known probe requests targeting non-existent PHP/CGI/sensitive files
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse(null, {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          "Connection": "close",
        },
      });
    }
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static image/asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

