import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Hostnames that represent the loopback interface. Anything else means the
// request reached us over a non-loopback bind (LAN, VPN, reverse proxy) and we
// refuse to serve our privileged /api endpoints, which can spawn processes and
// mutate local config.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  // Strip :port (handling IPv6 bracketed form)
  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return LOOPBACK_HOSTS.has(hostname);
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (!isLoopbackHost(host)) {
    return NextResponse.json(
      { error: "API is restricted to loopback access" },
      { status: 403 }
    );
  }

  // Defense in depth: reject cross-origin requests even if they somehow
  // reach the loopback interface (e.g. DNS rebinding).
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).hostname;
      if (!LOOPBACK_HOSTS.has(originHost)) {
        return NextResponse.json(
          { error: "Cross-origin request rejected" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid Origin header" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
