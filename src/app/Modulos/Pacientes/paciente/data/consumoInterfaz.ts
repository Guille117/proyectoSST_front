export interface ConsumoEpisodioItem {
  tipo: string;
  nombre: string;
  detalle: string | null;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface ConsumoEpisodio {
  episodioId: number;
  items: ConsumoEpisodioItem[];
  total: number;
}
