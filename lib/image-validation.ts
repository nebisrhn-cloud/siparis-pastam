export const IMAGE_LIMIT = 5 * 1024 * 1024;
export async function validateImageFile(file: File): Promise<void> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG veya WebP biçiminde bir görsel seçin.');
  }
  if (file.size === 0 || file.size > IMAGE_LIMIT) {
    throw new Error('Her görsel 5 MB veya daha küçük olmalıdır.');
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (!({ 'image/jpeg': jpeg, 'image/png': png, 'image/webp': webp }[file.type])) {
    throw new Error('Dosya içeriği görsel biçimiyle eşleşmiyor. Başka bir dosya seçin.');
  }
}
