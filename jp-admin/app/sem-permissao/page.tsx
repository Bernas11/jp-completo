import Link from "next/link";

export default function SemPermissaoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-jp-blue-tint p-6 text-center">
      <p className="font-display uppercase text-2xl text-jp-blue-deep">Sem permissão</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        A tua conta não tem acesso ao backoffice da Juventude Popular. Se achas que isto está
        errado, contacta a tua estrutura.
      </p>
      <Link href="/login" className="mt-2 text-sm font-medium text-jp-blue underline">
        Voltar ao login
      </Link>
    </div>
  );
}
