import { Place } from "../types/domain";
// Reemplazar por llamada real a Flask cuando esté listo
export async function searchPlaces(): Promise<Place[]> {
  return [
    { id:"1", name:"Café Prueba", address:"Santiago Centro", coords:{lat:-33.45,lng:-70.66}, source:"google", categories:["cafe"] },
    { id:"2", name:"Museo Demo", address:"Providencia", coords:{lat:-33.42,lng:-70.61}, source:"tripadvisor", categories:["museum"] }
  ];
}
