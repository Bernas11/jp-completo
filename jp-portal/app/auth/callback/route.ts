import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeInternalRedirect } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const redirectTo = getSafeInternalRedirect(
    request.nextUrl.searchParams.get("redirect_to"),
    request.url,
  );

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(new URL("/login?erro=link_invalido", request.url));
}
