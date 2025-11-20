export type InterestKey =
  | "museos"
  | "restaurantes"
  | "parques"
  | "miradores"
  | "senderismo"
  | "vida-nocturna"
  | "bares"
  | "playa"
  | "historia"
  | "arte-urbano"
  | "compras"
  | "deportes"
  | "monumentos"
  | "arquitectura"
  | "mercados";

export interface InterestItem {
  key: InterestKey;
  label: string;
  icon?: string;
  category: 'cultura' | 'naturaleza' | 'gastronomia' | 'aventura' | 'entretenimiento' | 'historia';
}

export const INTERESTS: InterestItem[] = [
  { key: "museos", label: "Museos", icon: "bank", category: "cultura" },
  { key: "monumentos", label: "Monumentos", icon: "chess-rook", category: "historia" },
  { key: "parques", label: "Parques", icon: "tree", category: "naturaleza" },
  { key: "restaurantes", label: "Restaurantes", icon: "silverware", category: "gastronomia" },
  { key: "bares", label: "Bares y Cafés", icon: "coffee", category: "gastronomia" },
  { key: "playa", label: "Playas", icon: "beach", category: "naturaleza" },
  { key: "senderismo", label: "Senderismo", icon: "hiking", category: "aventura" },
  { key: "vida-nocturna", label: "Vida Nocturna", icon: "music-note", category: "entretenimiento" },
  { key: "compras", label: "Compras", icon: "shopping", category: "entretenimiento" },
  { key: "arquitectura", label: "Arquitectura", icon: "city", category: "cultura" },
  { key: "mercados", label: "Mercados", icon: "store", category: "gastronomia" },
  { key: "deportes", label: "Deportes", icon: "basketball", category: "aventura" },
  { key: "miradores", label: "Miradores", icon: "eye", category: "naturaleza" },
  { key: "historia", label: "Historia", icon: "book-open", category: "historia" },
  { key: "arte-urbano", label: "Arte Urbano", icon: "palette", category: "cultura" },
];