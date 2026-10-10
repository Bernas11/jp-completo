/* Constante partilhada entre o server action (actions/news.ts) e o painel
 * do cliente (components/noticias/news-panel.tsx).
 *
 * CAUSA RAIZ de dois erros em produção (logs Vercel, 2026-09-25):
 *   - "TypeError: v.map is not a function" em /noticias
 *   - "Error: A 'use server' file can only export async functions,
 *     found object" em /eventos
 * Esta constante estava exportada diretamente de actions/news.ts, que
 * tem "use server" no topo. O Next.js exige que TODO export de um
 * ficheiro "use server" seja uma função assíncrona (vira uma referência
 * de server action) — um array exportado desse ficheiro quebra essa
 * regra. Isso não só impedia o próprio valor de chegar corretamente ao
 * cliente (daí o .map a falhar), como fazia o carregamento do módulo
 * inteiro falhar — e como events-list.tsx também importa
 * `toggleEventPublic` de "@/actions/news", isso arrastava consigo a
 * página de Eventos, apesar do bug não ter nada a ver com eventos.
 * Falta comum: uma constante simples exportada por engano do sítio
 * errado consegue partir páginas aparentemente não relacionadas. */
export const CATEGORIAS_ATIVIDADE = ["noticia", "comunicado", "atividade", "outro"] as const;
