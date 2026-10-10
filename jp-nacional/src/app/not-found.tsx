import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="pt">
      <body className="bg-jp-blue-deep flex min-h-screen items-center justify-center text-center px-6">
        <div>
          <p className="font-display text-jp-yellow text-6xl mb-4">404</p>
          <h1 className="font-headline text-2xl text-white mb-4">Esta página não existe.</h1>
          <p className="text-white/60 mb-8">
            Deves ter virado à esquerda e isso não costuma funcionar na casa da verdadeira direita.
          </p>
          <Link 
            href="/" 
            className="inline-block bg-jp-yellow text-jp-blue-deep font-display text-sm px-7 py-3.5 rounded-full"
          >
            Voltar à homepage
          </Link>
        </div>
      </body>
    </html>
  );
}
