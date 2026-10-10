// Utilitário partilhado de formatação de preço. O catálogo em si já não
// vive aqui — vem da tabela `products` (Supabase, Projeto Militância),
// gerida em JP-Admin → Loja → Produtos.

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  preco: number; // em cêntimos
  imagens: string[];
  categoria: string | null;
  disponivel: boolean;
};

export const formatPreco = (centimos: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(centimos / 100);
