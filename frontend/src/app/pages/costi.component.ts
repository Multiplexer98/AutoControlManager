import { Component, computed, inject, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import { Auto, CostoAnno } from '../core/models';

/** Palette categorica validata (dataviz skill): ordine fisso, mai ciclica. */
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

const GAP_SEGMENTO = 3; // spazio (in unità SVG) tra i segmenti impilati
const RAGGIO_TOP = 4; // arrotondamento del "data-end" in cima allo stack
const BAND = 78; // larghezza di banda per anno
const BARRA = 30; // larghezza della barra dentro la banda
const PAD_TOP = 30; // spazio per l'etichetta del totale
const PLOT_H = 170; // altezza utile del grafico
const PAD_BOTTOM = 26; // spazio per l'etichetta dell'anno
const SVG_H = PAD_TOP + PLOT_H + PAD_BOTTOM;

interface Segmento {
  autoId: number;
  nome: string;
  colore: string;
  valore: number;
  y: number;
  altezza: number;
  path?: string;
}

interface Barra {
  anno: number;
  x: number;
  totale: number;
  segmenti: Segmento[];
}

function rettangoloTopArrotondato(x: number, y: number, w: number, h: number, r: number): string {
  const raggio = Math.min(r, h, w / 2);
  if (raggio <= 0) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`;
  return (
    `M${x},${y + h} L${x},${y + raggio} ` +
    `Q${x},${y} ${x + raggio},${y} ` +
    `L${x + w - raggio},${y} ` +
    `Q${x + w},${y} ${x + w},${y + raggio} ` +
    `L${x + w},${y + h} Z`
  );
}

/** Arrotonda per eccesso a un numero "pulito" (1/2/5/10 × 10^n), per assi leggibili. */
function arrotondaSuPulito(valore: number): number {
  if (valore <= 0) return 100;
  const magnitudine = Math.pow(10, Math.floor(Math.log10(valore)));
  const normalizzato = valore / magnitudine;
  const passo = normalizzato <= 1 ? 1 : normalizzato <= 2 ? 2 : normalizzato <= 5 ? 5 : 10;
  return passo * magnitudine;
}

@Component({
  selector: 'app-costi',
  standalone: true,
  template: `
    <h2>Costi di manutenzione</h2>

    @if (auto() === null || costi() === null) {
      <div class="stato-caricamento">
        <div class="spinner"></div>
        <p>Caricamento costi…</p>
      </div>
    } @else if (costi()!.length === 0) {
      <p class="vuoto">Nessun costo registrato ancora: aggiungi un importo quando registri una manutenzione.</p>
    } @else {
      <div class="riga-stat">
        <div class="stat-tile">
          <span class="stat-label">Speso nel {{ annoCorrente }}</span>
          <span class="stat-value">{{ formattaEuro(totaleAnnoCorrente()) }}</span>
          @if (deltaPercentuale(); as d) {
            <span class="stat-delta" [class.buono]="d < 0" [class.serio]="d > 0">
              {{ d > 0 ? '▲' : d < 0 ? '▼' : '' }} {{ formattaPercentuale(d) }} vs {{ annoCorrente - 1 }}
            </span>
          } @else {
            <span class="stat-delta lieve">nessun dato per {{ annoCorrente - 1 }}</span>
          }
        </div>
        <div class="stat-tile">
          <span class="stat-label">Totale (auto selezionate, tutti gli anni)</span>
          <span class="stat-value">{{ formattaEuro(totaleComplessivo()) }}</span>
        </div>
      </div>

      <div class="filtri-auto">
        @for (a of auto(); track a.id) {
          <button
            type="button"
            class="chip-auto"
            [class.attivo]="selezionate().has(a.id)"
            [style.--colore-chip]="coloreAuto().get(a.id)"
            [attr.aria-pressed]="selezionate().has(a.id)"
            (click)="toggleAuto(a.id)"
          >
            <span class="pallino" [style.background]="coloreAuto().get(a.id)"></span>
            {{ a.nome }}
            @if (!a.attiva) {
              <small>archiviata</small>
            }
          </button>
        }
        <button type="button" class="lieve" (click)="vistaTabella.set(!vistaTabella())">
          {{ vistaTabella() ? 'Vedi grafico' : 'Vedi tabella' }}
        </button>
      </div>

      @if (autoSelezionate().length === 0) {
        <p class="vuoto">Seleziona almeno un'auto per vedere i costi.</p>
      } @else if (vistaTabella()) {
        <div class="tabella-wrap">
          <table>
            <tr>
              <th>Anno</th>
              @for (a of autoSelezionate(); track a.id) {
                <th>{{ a.nome }}</th>
              }
              <th>Totale</th>
            </tr>
            @for (anno of anni(); track anno) {
              <tr>
                <td>{{ anno }}</td>
                @for (a of autoSelezionate(); track a.id) {
                  <td>{{ formattaEuro(pivot().get(anno)?.get(a.id) ?? 0) }}</td>
                }
                <td><strong>{{ formattaEuro(totalePerAnno().get(anno) ?? 0) }}</strong></td>
              </tr>
            }
          </table>
        </div>
      } @else {
        <div class="card">
          <div class="legenda-costi">
            @for (a of autoSelezionate(); track a.id) {
              <span class="voce-legenda">
                <span class="pallino" [style.background]="coloreAuto().get(a.id)"></span>
                {{ a.nome }}
              </span>
            }
          </div>

          <div class="grafico-costi-wrap">
            <svg
              [attr.viewBox]="'0 0 ' + larghezzaSvg() + ' ' + svgH"
              [attr.width]="larghezzaSvg()"
              [attr.height]="svgH"
              preserveAspectRatio="xMinYMin meet"
            >
              <!-- gridline -->
              <line x1="0" [attr.x2]="larghezzaSvg()" [attr.y1]="padTop" [attr.y2]="padTop" class="gridline" />
              <line
                x1="0"
                [attr.x2]="larghezzaSvg()"
                [attr.y1]="padTop + plotH / 2"
                [attr.y2]="padTop + plotH / 2"
                class="gridline"
              />
              <line
                x1="0"
                [attr.x2]="larghezzaSvg()"
                [attr.y1]="padTop + plotH"
                [attr.y2]="padTop + plotH"
                class="asse"
              />

              <text x="4" [attr.y]="padTop - 6" class="etichetta-asse">{{ formattaEuroCompatto(massimoY()) }}</text>
              <text x="4" [attr.y]="padTop + plotH / 2 - 6" class="etichetta-asse">
                {{ formattaEuroCompatto(massimoY() / 2) }}
              </text>

              @for (b of barre(); track b.anno) {
                @if (hoverAnno() === b.anno) {
                  <rect
                    [attr.x]="b.x + 3"
                    y="2"
                    [attr.width]="band - 6"
                    [attr.height]="svgH - 4"
                    rx="10"
                    class="sfondo-hover"
                  />
                }

                @for (s of b.segmenti; track s.autoId) {
                  @if (s.path) {
                    <path [attr.d]="s.path" [attr.fill]="s.colore" />
                  } @else {
                    <rect
                      [attr.x]="b.x + (band - barra) / 2"
                      [attr.y]="s.y"
                      [attr.width]="barra"
                      [attr.height]="s.altezza"
                      [attr.fill]="s.colore"
                    />
                  }
                }

                <text [attr.x]="b.x + band / 2" [attr.y]="padTop - 10" text-anchor="middle" class="etichetta-totale">
                  {{ formattaEuroCompatto(b.totale) }}
                </text>
                <text [attr.x]="b.x + band / 2" [attr.y]="padTop + plotH + 20" text-anchor="middle" class="etichetta-anno">
                  {{ b.anno }}
                </text>

                <rect
                  [attr.x]="b.x"
                  y="0"
                  [attr.width]="band"
                  [attr.height]="svgH"
                  fill="transparent"
                  tabindex="0"
                  role="img"
                  [attr.aria-label]="'Anno ' + b.anno + ', totale ' + formattaEuro(b.totale)"
                  (pointerenter)="hoverAnno.set(b.anno)"
                  (pointerleave)="hoverAnno.set(null)"
                  (focus)="hoverAnno.set(b.anno)"
                  (blur)="hoverAnno.set(null)"
                  (click)="hoverAnno.set(hoverAnno() === b.anno ? null : b.anno)"
                />
              }
            </svg>

            @if (barraHover(); as b) {
              <div class="tooltip-costi" [style.left.%]="posizioneTooltip()">
                <strong>{{ b.anno }}</strong>
                @for (s of b.segmenti; track s.autoId) {
                  <div class="riga-tooltip">
                    <span class="chiave" [style.background]="s.colore"></span>
                    {{ s.nome }}: <b>{{ formattaEuro(s.valore) }}</b>
                  </div>
                }
                <div class="riga-tooltip totale">Totale: <b>{{ formattaEuro(b.totale) }}</b></div>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class CostiComponent {
  private api = inject(ApiService);

  readonly padTop = PAD_TOP;
  readonly plotH = PLOT_H;
  readonly svgH = SVG_H;
  readonly band = BAND;
  readonly barra = BARRA;
  readonly annoCorrente = new Date().getFullYear();

  auto = signal<Auto[] | null>(null);
  costi = signal<CostoAnno[] | null>(null);
  selezionate = signal<Set<number>>(new Set());
  vistaTabella = signal(false);
  hoverAnno = signal<number | null>(null);

  constructor() {
    this.api.listaAuto(true).subscribe((lista) => {
      this.auto.set(lista);
      // Al primo caricamento selezioniamo di default le auto attive.
      if (this.selezionate().size === 0) {
        this.selezionate.set(new Set(lista.filter((a) => a.attiva).map((a) => a.id)));
      }
    });
    this.api.costiPerAnno().subscribe((c) => this.costi.set(c));
  }

  toggleAuto(id: number) {
    const s = new Set(this.selezionate());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.selezionate.set(s);
  }

  /** Colore fisso per auto (ordine per id, stabile a prescindere dalla selezione). */
  coloreAuto = computed(() => {
    const ordinate = [...(this.auto() ?? [])].sort((a, b) => a.id - b.id);
    const mappa = new Map<number, string>();
    ordinate.forEach((a, i) => mappa.set(a.id, PALETTE[i % PALETTE.length]));
    return mappa;
  });

  autoSelezionate = computed(() => (this.auto() ?? []).filter((a) => this.selezionate().has(a.id)));

  anni = computed(() => [...new Set((this.costi() ?? []).map((r) => r.anno))].sort((a, b) => a - b));

  /** anno -> (auto_id -> totale) */
  pivot = computed(() => {
    const mappa = new Map<number, Map<number, number>>();
    for (const r of this.costi() ?? []) {
      if (!mappa.has(r.anno)) mappa.set(r.anno, new Map());
      mappa.get(r.anno)!.set(r.auto_id, r.totale);
    }
    return mappa;
  });

  totalePerAnno = computed(() => {
    const p = this.pivot();
    const sel = this.selezionate();
    const risultato = new Map<number, number>();
    for (const anno of this.anni()) {
      let tot = 0;
      for (const [autoId, val] of p.get(anno) ?? []) {
        if (sel.has(autoId)) tot += val;
      }
      risultato.set(anno, tot);
    }
    return risultato;
  });

  massimoY = computed(() => arrotondaSuPulito(Math.max(1, ...this.totalePerAnno().values())));

  totaleAnnoCorrente = computed(() => this.totalePerAnno().get(this.annoCorrente) ?? 0);

  deltaPercentuale = computed(() => {
    const precedente = this.totalePerAnno().get(this.annoCorrente - 1) ?? 0;
    if (precedente === 0) return null;
    return ((this.totaleAnnoCorrente() - precedente) / precedente) * 100;
  });

  totaleComplessivo = computed(() => {
    let s = 0;
    for (const v of this.totalePerAnno().values()) s += v;
    return s;
  });

  larghezzaSvg = computed(() => Math.max(this.anni().length * BAND, BAND));

  /** Geometria delle barre impilate, pre-calcolata per il template. */
  barre = computed<Barra[]>(() => {
    const p = this.pivot();
    const massimo = this.massimoY();
    const baseline = PAD_TOP + PLOT_H;
    const ordineStack = [...this.autoSelezionate()].sort((a, b) => a.id - b.id);

    return this.anni().map((anno, indice) => {
      const perAuto = p.get(anno);
      const visibili = ordineStack
        .map((a) => ({ auto: a, valore: perAuto?.get(a.id) ?? 0 }))
        .filter((v) => v.valore > 0);

      let yCumulato = baseline;
      const segmenti: Segmento[] = visibili.map((v, i) => {
        const altezzaPiena = (v.valore / massimo) * PLOT_H;
        const yTop = yCumulato - altezzaPiena;
        const ultimo = i === visibili.length - 1;
        const colore = this.coloreAuto().get(v.auto.id) ?? PALETTE[0];
        yCumulato = yTop;

        if (ultimo) {
          return {
            autoId: v.auto.id,
            nome: v.auto.nome,
            colore,
            valore: v.valore,
            y: yTop,
            altezza: altezzaPiena,
            path: rettangoloTopArrotondato(0, yTop, BARRA, altezzaPiena, RAGGIO_TOP),
          };
        }
        const altezzaResa = Math.max(altezzaPiena - GAP_SEGMENTO, 1);
        return {
          autoId: v.auto.id,
          nome: v.auto.nome,
          colore,
          valore: v.valore,
          y: yTop + GAP_SEGMENTO,
          altezza: altezzaResa,
        };
      });

      // Il path del segmento in cima è calcolato con x=0: lo traslo qui in coordinate reali.
      const x = indice * BAND;
      const offsetBarraX = (BAND - BARRA) / 2;

      return {
        anno,
        x,
        totale: visibili.reduce((acc, v) => acc + v.valore, 0),
        segmenti: segmenti.map((s) =>
          s.path
            ? { ...s, path: traslaPathX(s.path, x + offsetBarraX) }
            : s,
        ),
      };
    });
  });

  barraHover = computed(() => this.barre().find((b) => b.anno === this.hoverAnno()) ?? null);

  posizioneTooltip = computed(() => {
    const indice = this.anni().indexOf(this.hoverAnno() ?? -1);
    if (indice < 0) return 50;
    return ((indice + 0.5) / this.anni().length) * 100;
  });

  formattaEuro(v: number): string {
    return v.toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' €';
  }

  formattaEuroCompatto(v: number): string {
    if (v >= 1000) return (v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + 'k €';
    return this.formattaEuro(v);
  }

  formattaPercentuale(v: number): string {
    return Math.abs(v).toLocaleString('it-IT', { maximumFractionDigits: 0 }) + '%';
  }
}

/** Trasla solo la componente x di un path "M x,y L x,y Q x,y x,y ...". */
function traslaPathX(path: string, dx: number): string {
  return path.replace(/([ML])(-?[\d.]+),(-?[\d.]+)/g, (_m, comando, x, y) => {
    return `${comando}${(parseFloat(x) + dx).toFixed(2)},${y}`;
  }).replace(/(Q)(-?[\d.]+),(-?[\d.]+) (-?[\d.]+),(-?[\d.]+)/g, (_m, comando, x1, y1, x2, y2) => {
    return `${comando}${(parseFloat(x1) + dx).toFixed(2)},${y1} ${(parseFloat(x2) + dx).toFixed(2)},${y2}`;
  });
}
