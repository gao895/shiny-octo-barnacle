const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_TYPE_JSON = 0x4e4f534a; // 'JSON'
const CHUNK_TYPE_BIN = 0x004e4942; // 'BIN\0'

export interface ParsedGlb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  bin: ArrayBuffer | null;
}

/** Splits a .glb binary container into its JSON and BIN chunks (glTF 2.0 binary spec). */
export function parseGlb(buffer: ArrayBuffer): ParsedGlb {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('無効な GLB ファイルです (magic不一致)');
  }
  const length = dv.getUint32(8, true);

  let offset = 12;
  let json: ParsedGlb['json'] = null;
  let bin: ArrayBuffer | null = null;

  while (offset < length) {
    const chunkLength = dv.getUint32(offset, true);
    offset += 4;
    const chunkType = dv.getUint32(offset, true);
    offset += 4;
    const chunkData = buffer.slice(offset, offset + chunkLength);
    offset += chunkLength;

    if (chunkType === CHUNK_TYPE_JSON) {
      json = JSON.parse(new TextDecoder('utf-8').decode(chunkData));
    } else if (chunkType === CHUNK_TYPE_BIN) {
      bin = chunkData;
    }
  }

  if (!json) throw new Error('GLB に JSON チャンクが見つかりません');
  return { json, bin };
}

/** Reassembles a .glb binary container from a (possibly mutated) JSON chunk + original BIN chunk. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildGlb(json: any, bin: ArrayBuffer | null): ArrayBuffer {
  const jsonString = JSON.stringify(json);
  const jsonBytesRaw = new TextEncoder().encode(jsonString);
  const jsonPadding = (4 - (jsonBytesRaw.byteLength % 4)) % 4;
  const jsonBytes = new Uint8Array(jsonBytesRaw.byteLength + jsonPadding);
  jsonBytes.set(jsonBytesRaw);
  jsonBytes.fill(0x20, jsonBytesRaw.byteLength); // pad with spaces per spec

  const binSource = bin ? new Uint8Array(bin) : null;
  const binPadding = binSource ? (4 - (binSource.byteLength % 4)) % 4 : 0;
  const binBytes = binSource ? new Uint8Array(binSource.byteLength + binPadding) : null;
  if (binBytes && binSource) binBytes.set(binSource); // remaining bytes are already zero

  const totalLength = 12 + 8 + jsonBytes.byteLength + (binBytes ? 8 + binBytes.byteLength : 0);
  const buffer = new ArrayBuffer(totalLength);
  const dv = new DataView(buffer);
  let offset = 0;

  dv.setUint32(offset, GLB_MAGIC, true);
  offset += 4;
  dv.setUint32(offset, 2, true);
  offset += 4;
  dv.setUint32(offset, totalLength, true);
  offset += 4;

  dv.setUint32(offset, jsonBytes.byteLength, true);
  offset += 4;
  dv.setUint32(offset, CHUNK_TYPE_JSON, true);
  offset += 4;
  new Uint8Array(buffer, offset, jsonBytes.byteLength).set(jsonBytes);
  offset += jsonBytes.byteLength;

  if (binBytes) {
    dv.setUint32(offset, binBytes.byteLength, true);
    offset += 4;
    dv.setUint32(offset, CHUNK_TYPE_BIN, true);
    offset += 4;
    new Uint8Array(buffer, offset, binBytes.byteLength).set(binBytes);
    offset += binBytes.byteLength;
  }

  return buffer;
}
