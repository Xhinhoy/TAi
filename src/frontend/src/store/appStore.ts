import { create } from "zustand";
type Filters = { city: string; budget: "low"|"mid"|"high"; days: number; interests: string[]; };
type AppState = { filters: Filters; setFilters: (p: Partial<Filters>) => void; };
export const useAppStore = create<AppState>((set)=>({
  filters: { city:"Santiago", budget:"mid", days:3, interests:["gastronomy","museums"] },
  setFilters: (p)=> set((s)=>({ filters: { ...s.filters, ...p } }))
}));
