import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "strict",
              secure: process.env.NODE_ENV === "production",
            }),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /api/cron/* não tem sessão de utilizador (é chamado pelo Vercel Cron) —
  // essas rotas autenticam-se sozinhas com CRON_SECRET, por isso não podem
  // ser redirecionadas para /login.
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/api/cron/");

  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const lastActivityCookie = request.cookies.get("jp-admin-last-activity")?.value;
    const now = Date.now();

    if (lastActivityCookie && now - Number(lastActivityCookie) > INACTIVITY_TIMEOUT_MS) {
      await supabase.auth.signOut();
      const redirectUrl = new URL("/login?motivo=inatividade", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    response.cookies.set("jp-admin-last-activity", String(now), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: INACTIVITY_TIMEOUT_MS / 1000,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
