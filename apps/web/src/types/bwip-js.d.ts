declare module "bwip-js" {
  interface BwipOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: "left" | "center" | "right" | "offleft" | "offright" | "justify";
    [key: string]: unknown;
  }

  function toCanvas(canvas: HTMLCanvasElement | string, options: BwipOptions): HTMLCanvasElement;

  const bwipjs: {
    toCanvas: typeof toCanvas;
  };

  export default bwipjs;
}
