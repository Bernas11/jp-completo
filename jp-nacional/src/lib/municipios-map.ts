import fs from "node:fs";
import path from "node:path";

/* CAUSA RAIZ (parcial) do item 1 — performance mobile: o mapa de
 * municípios (usado na homepage E em /concelhias) carregava a
 * biblioteca completa leaflet + react-leaflet (mapa com zoom/pan/tiles)
 * só para desenhar 278 polígonos ESTÁTICOS sem zoom nem pan (o próprio
 * componente já desativava scrollWheelZoom, zoomControl e
 * attributionControl — ou seja, pagava o custo de uma biblioteca de
 * mapas completa sem usar nenhuma das suas features de mapa real).
 * A isto somava-se um fetch client-side de 574KB de GeoJSON depois do
 * JS carregar, antes de desenhar uma única forma.
 *
 * Substituído por um SVG estático: os 278 polígonos são convertidos
 * aqui, NO SERVIDOR, para paths SVG (projeção equirretangular simples,
 * suficiente para um mapa de Portugal continental — não precisa de
 * exatidão cartográfica). O resultado já vem pronto no HTML inicial,
 * sem JS de terceiros e sem pedido extra ao carregar a página; só o
 * hover/click (pouco código) precisa de correr no cliente. */

export type MunicipioPath = {
  d: string;
  concelho: string;
  distrito: string;
};

let cache: MunicipioPath[] | null = null;

type GeoJsonFeature = {
  type: "Feature";
  properties: { concelho?: string; distrito?: string } | null;
  geometry:
    | { type: "Polygon"; coordinates: [number, number][][] }
    | { type: "MultiPolygon"; coordinates: [number, number][][][] }
    | { type: string; coordinates: unknown };
};

/* O GeoJSON tem ~13 700 pontos; escritos a 1 casa decimal davam ~165KB de HTML, repetidos no
 * payload RSC (os paths vão como props para o componente client) — o que pesa muito no
 * telemóvel. Simplificação Ramer–Douglas–Peucker com tolerância de 1,2 unidades do viewBox
 * (≈0,5px num ecrã de 360px) e coordenadas inteiras: ~40% menos HTML, sem diferença visível. */
function simplify(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length <= 2) return points;

  // Os anéis do GeoJSON são fechados (primeiro ponto == último): o RDP direto colapsava tudo
  // porque a "corda" inicial tem comprimento 0. Parte-se o anel no ponto mais afastado do início.
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1] && points.length > 3) {
    let far = 1;
    let farDist = -1;
    for (let i = 1; i < points.length - 1; i++) {
      const d = Math.hypot(points[i][0] - first[0], points[i][1] - first[1]);
      if (d > farDist) {
        farDist = d;
        far = i;
      }
    }
    const a = simplify(points.slice(0, far + 1), epsilon);
    const b = simplify(points.slice(far), epsilon);
    return [...a, ...b.slice(1)];
  }

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let maxDist = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (maxDist > epsilon && idx !== -1) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

export function getMunicipiosSvgPaths(): MunicipioPath[] {
  if (cache) return cache;

  const filePath = path.join(process.cwd(), "public", "data", "concelhos.geojson");
  const raw = fs.readFileSync(filePath, "utf-8");
  const geojson = JSON.parse(raw) as { features: GeoJsonFeature[] };

  // bounding box de todas as coordenadas, para escalar para o viewBox
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const polygons: { rings: [number, number][][]; concelho: string; distrito: string }[] = [];

  for (const feature of geojson.features) {
    const props = feature.properties ?? {};
    const geom = feature.geometry;
    const multiPolygons: [number, number][][][] =
      geom.type === "Polygon"
        ? [geom.coordinates as [number, number][][]]
        : geom.type === "MultiPolygon"
          ? (geom.coordinates as [number, number][][][])
          : [];

    for (const rings of multiPolygons) {
      for (const ring of rings) {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
      polygons.push({ rings, concelho: props.concelho ?? "", distrito: props.distrito ?? "" });
    }
  }

  const meanLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lonScale = Math.cos(meanLatRad); // corrige a distorção de longitude a esta latitude
  const VIEW_W = 800;
  const VIEW_H = 1000;
  const PADDING = 20;

  const spanX = (maxLon - minLon) * lonScale || 1;
  const spanY = maxLat - minLat || 1;
  const scale = Math.min((VIEW_W - PADDING * 2) / spanX, (VIEW_H - PADDING * 2) / spanY);

  const project = ([lon, lat]: [number, number]): [number, number] => {
    const x = PADDING + (lon - minLon) * lonScale * scale;
    const y = PADDING + (maxLat - lat) * scale; // inverte Y (latitude cresce para norte, SVG cresce para baixo)
    return [x, y];
  };

  const grouped = new Map<string, MunicipioPath>();

  for (const { rings, concelho, distrito } of polygons) {
    const dParts = rings
      .map((ring) => {
        const points = simplify(ring.map(project), 1.2);
        if (points.length < 3) return "";
        return `M${points.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join("L")}Z`;
      })
      .filter(Boolean)
      .join(" ");

    const existing = grouped.get(concelho);
    if (existing) {
      existing.d += ` ${dParts}`;
    } else {
      grouped.set(concelho, { d: dParts, concelho, distrito });
    }
  }

  cache = Array.from(grouped.values());
  return cache;
}

export const MUNICIPIOS_VIEWBOX = "0 0 800 1000";
