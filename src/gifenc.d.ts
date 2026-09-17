declare module 'gifenc' {
  export class GIFEncoder {
    constructor();
    writeFrame(
      index: Uint8Array | number[],
      width: number,
      height: number,
      opts?: {
        palette?: Array<[number, number, number]>;
        delay?: number;
        repeat?: number;
        first?: boolean;
        transparent?: boolean;
        transparentIndex?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  }
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: object,
  ): { palette: Array<[number, number, number]>; index: Uint8Array };
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Array<[number, number, number]>,
    format?: string,
  ): Uint8Array;
}
