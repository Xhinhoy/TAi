export type InterestId =
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
| "deportes";


export type InterestItem = {
id: InterestId;
label: string; // texto a mostrar
cover?: string; // opcional, para mosaico estilo Pinterest
};


export const INTERESTS: InterestItem[] = [
{ id: "museos", label: "Museos" },
{ id: "restaurantes", label: "Restaurantes" },
{ id: "parques", label: "Parques" },
{ id: "miradores", label: "Miradores" },
{ id: "senderismo", label: "Senderismo" },
{ id: "vida-nocturna", label: "Vida nocturna" },
{ id: "bares", label: "Bares" },
{ id: "playa", label: "Playas" },
{ id: "historia", label: "Historia" },
{ id: "arte-urbano", label: "Arte urbano" },
{ id: "compras", label: "Compras" },
{ id: "deportes", label: "Deportes" },
];