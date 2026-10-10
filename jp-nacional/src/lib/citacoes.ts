export type Citacao = {
  texto: string;
  autor: string;
  cargo?: string;
};

export const CITACOES: Citacao[] = [
  {
    texto: "Devemos ter confiança no futuro, a juventude não é instalada!",
    autor: "Adelino Amaro da Costa",
    cargo: "Fundador do CDS",
  },
  {
    texto: "Ser autêntico e viver de acordo com aquilo que se pensa até às últimas consequências, é difícil, mas tem um grande prémio.",
    autor: "Adelino Amaro da Costa",
    cargo: "Fundador do CDS",
  },
  {
    texto: "Quando é que se tornará finalmente evidente que sem um novo desenvolvimento político não haverá qualquer desenvolvimento económico?",
    autor: "Francisco Lucas Pires",
    cargo: "Fundador do CDS",
  },
];

export const MOTE_ATUAL = {
  texto: "Do Dizer ao Fazer. Por Portugal!",
  autor: "Catarina Marinho",
  cargo: "Presidente da Juventude Popular",
};
