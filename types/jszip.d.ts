declare module "jszip" {
  export type JSZipOutputType = "string" | "blob" | "uint8array" | "arraybuffer" | "nodebuffer";

  export type JSZipEntry = {
    dir: boolean;
    name: string;
    async(type: "string"): Promise<string>;
    async(type: "blob"): Promise<Blob>;
    async(type: "uint8array"): Promise<Uint8Array>;
    async(type: "arraybuffer"): Promise<ArrayBuffer>;
    async(type: "nodebuffer"): Promise<Buffer>;
  };

  export default class JSZip {
    files: Record<string, JSZipEntry>;

    file(path: string): JSZipEntry | null;
    file(path: string, data: unknown): this;
    folder(name: string): JSZip;
    generateAsync(options: { type: "string" } & Record<string, unknown>): Promise<string>;
    generateAsync(options: { type: "blob" } & Record<string, unknown>): Promise<Blob>;
    generateAsync(options: { type: "uint8array" } & Record<string, unknown>): Promise<Uint8Array>;
    generateAsync(options: { type: "arraybuffer" } & Record<string, unknown>): Promise<ArrayBuffer>;
    generateAsync(options: { type: "nodebuffer" } & Record<string, unknown>): Promise<Buffer>;

    static loadAsync(data: Blob | ArrayBuffer | Uint8Array | Buffer | File): Promise<JSZip>;
  }
}
