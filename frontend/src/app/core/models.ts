export type TipoScadenza =
  | 'TAGLIANDO'
  | 'REVISIONE'
  | 'BOLLO'
  | 'ASSICURAZIONE'
  | 'ALTRO';

export const TIPI_SCADENZA: TipoScadenza[] = [
  'TAGLIANDO',
  'REVISIONE',
  'BOLLO',
  'ASSICURAZIONE',
  'ALTRO',
];

export interface Auto {
  id: number;
  nome: string;
  targa: string;
  modello: string | null;
  anno: number | null;
  attiva: boolean;
}

export interface Scadenza {
  id: number;
  auto_id: number;
  tipo: TipoScadenza;
  data_esecuzione: string | null;
  km_esecuzione: number | null;
  data_prossima_scadenza: string;
  costo: number | null;
  note: string | null;
  reminder_inviato: boolean;
}

export interface ScadenzaProssima extends Scadenza {
  auto_nome: string;
  targa: string;
  giorni_mancanti: number;
}

export interface CostoAnno {
  auto_id: number;
  auto_nome: string;
  anno: number;
  totale: number;
}
