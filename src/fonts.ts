import inter from "@fontsource-variable/inter/files/inter-latin-standard-normal.woff2";
import dmSans from "@fontsource-variable/dm-sans/files/dm-sans-latin-standard-normal.woff2";

export async function loadFonts() {
  const results = await Promise.allSettled([
    register("Inter", inter),
    register("DM Sans", dmSans),
  ]);
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") console.error(`[opportunity-lifecycle] ${index === 0 ? "Inter" : "DM Sans"} font could not load`, result.reason);
  }
  const failed = results.every(result => result.status === "rejected");
  document.documentElement.dataset.fontStatus = failed ? "unavailable" : results[1].status === "fulfilled" ? "dm-sans" : "inter";
  if (failed) throw new Error("Bundled fonts could not load.");
}

async function register(family: string, bytes: Uint8Array<ArrayBuffer>) {
  // Binary sources are part of the bundle, not a font URL or data-URI request.
  const face = new FontFace(family, bytes, { weight: "100 900", style: "normal" });
  await face.load();
  document.fonts.add(face);
}
