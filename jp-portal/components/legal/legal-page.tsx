import Link from "next/link";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-jp-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display uppercase text-sm text-jp-blue-deep">
            Portal JP
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display uppercase text-3xl text-jp-blue-deep">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
        <div className="prose prose-sm mt-8 max-w-none space-y-4 text-jp-ink [&_h2]:font-display [&_h2]:uppercase [&_h2]:text-jp-blue-deep [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
          {children}
        </div>

        <div className="mt-10 flex gap-4 border-t border-jp-line pt-6 text-sm">
          <Link href="/politica-privacidade" className="text-jp-blue hover:underline">
            Política de Privacidade
          </Link>
          <Link href="/politica-cookies" className="text-jp-blue hover:underline">
            Política de Cookies
          </Link>
          <Link href="/termos-condicoes" className="text-jp-blue hover:underline">
            Termos e Condições
          </Link>
        </div>
      </main>
    </div>
  );
}
