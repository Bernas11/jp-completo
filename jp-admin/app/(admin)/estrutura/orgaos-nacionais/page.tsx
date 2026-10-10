import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NationalBodiesEditor } from "@/components/estrutura/national-bodies-editor";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function OrgaosNacionaisPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: positions, error: positionsError } = await supabase
    .from("national_body_positions")
    .select(
      "id, title, body_key, display_order, national_body_members(full_name, photo_url, start_date, end_date)",
    )
    .order("display_order");

  const hasError = positionsError;

  const positionsWithCurrentHolder = (positions ?? []).map((position) => {
    const members = position.national_body_members as unknown as {
      full_name: string;
      photo_url: string | null;
      start_date: string;
      end_date: string | null;
    }[];
    const currentHolder = members.find((m) => m.end_date === null) ?? null;
    return {
      id: position.id,
      title: position.title,
      body_key: position.body_key,
      display_order: position.display_order,
      currentHolder,
    };
  });

  return (
    <div>
      <PageHeader
        title="Órgãos Nacionais"
        description="Composição atual da Comissão Política Nacional e cargos dirigentes."
      />
      {hasError ? (
        <ErrorState
          title="Não foi possível carregar os órgãos nacionais"
          description="Confirma que tens permissões para esta área."
        />
      ) : (
        <NationalBodiesEditor positions={positionsWithCurrentHolder} />
      )}
    </div>
  );
}
