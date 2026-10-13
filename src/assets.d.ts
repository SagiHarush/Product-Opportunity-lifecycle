declare module "*.woff2" {
  const bytes: Uint8Array<ArrayBuffer>;
  export default bytes;
}

interface FontFaceSet {
  add(font: FontFace): FontFaceSet;
}
