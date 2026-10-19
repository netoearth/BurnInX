const fs = require('fs');
const { execSync } = require('child_process');

// Sizes to include in Windows 3.00 format ICO
const sizes = [16, 24, 32, 48, 64, 128, 256];

const imagesData = [];

for (const size of sizes) {
  // Use ImageMagick to resize icon.png to raw RGBA
  const rawRgba = execSync(`convert src-tauri/icons/icon.png -resize ${size}x${size}! -depth 8 rgba:-`);
  
  const width = size;
  const height = size;
  const xorSize = width * height * 4;
  
  // AND mask row stride aligned to 32-bit DWORD (4 bytes)
  const andRowStride = Math.ceil(width / 32) * 4;
  const andSize = andRowStride * height;
  
  const bihSize = 40;
  const resSize = bihSize + xorSize + andSize;
  
  const buffer = Buffer.alloc(resSize);
  
  // BITMAPINFOHEADER (40 bytes)
  buffer.writeUInt32LE(40, 0); // biSize
  buffer.writeInt32LE(width, 4); // biWidth
  buffer.writeInt32LE(height * 2, 8); // biHeight (XOR + AND mask)
  buffer.writeUInt16LE(1, 12); // biPlanes
  buffer.writeUInt16LE(32, 14); // biBitCount
  buffer.writeUInt32LE(0, 16); // biCompression (BI_RGB)
  buffer.writeUInt32LE(xorSize + andSize, 20); // biSizeImage
  buffer.writeInt32LE(0, 24); // biXPelsPerMeter
  buffer.writeInt32LE(0, 28); // biYPelsPerMeter
  buffer.writeUInt32LE(0, 32); // biClrUsed
  buffer.writeUInt32LE(0, 36); // biClrImportant
  
  let xorOffset = 40;
  let andOffset = 40 + xorSize;
  
  // XOR mask: BGRA stored bottom-to-top
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const r = rawRgba[srcIdx];
      const g = rawRgba[srcIdx + 1];
      const b = rawRgba[srcIdx + 2];
      const a = rawRgba[srcIdx + 3];
      
      buffer[xorOffset++] = b;
      buffer[xorOffset++] = g;
      buffer[xorOffset++] = r;
      buffer[xorOffset++] = a;
    }
  }
  
  // AND mask: 1-bit mask bottom-to-top (0 = opaque, 1 = transparent)
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = andOffset;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const a = rawRgba[srcIdx + 3];
      if (a < 128) {
        const bytePos = rowStart + Math.floor(x / 8);
        const bitPos = 7 - (x % 8);
        buffer[bytePos] |= (1 << bitPos);
      }
    }
    andOffset += andRowStride;
  }
  
  imagesData.push({
    width: width >= 256 ? 0 : width,
    height: height >= 256 ? 0 : height,
    size: resSize,
    data: buffer
  });
}

// Assemble full ICO
const headerSize = 6;
const dirSize = imagesData.length * 16;
let currentOffset = headerSize + dirSize;

const fullIco = [Buffer.alloc(headerSize + dirSize)];

// ICONDIR
fullIco[0].writeUInt16LE(0, 0); // Reserved
fullIco[0].writeUInt16LE(1, 2); // Type 1 (ICO)
fullIco[0].writeUInt16LE(imagesData.length, 4); // Count

// ICONDIRENTRY
imagesData.forEach((img, idx) => {
  const entryOffset = headerSize + idx * 16;
  fullIco[0].writeUInt8(img.width, entryOffset + 0);
  fullIco[0].writeUInt8(img.height, entryOffset + 1);
  fullIco[0].writeUInt8(0, entryOffset + 2); // Colors
  fullIco[0].writeUInt8(0, entryOffset + 3); // Reserved
  fullIco[0].writeUInt16LE(1, entryOffset + 4); // Planes
  fullIco[0].writeUInt16LE(32, entryOffset + 6); // BitCount
  fullIco[0].writeUInt32LE(img.size, entryOffset + 8); // BytesInRes
  fullIco[0].writeUInt32LE(currentOffset, entryOffset + 12); // Offset
  
  fullIco.push(img.data);
  currentOffset += img.size;
});

const finalBuffer = Buffer.concat(fullIco);
fs.writeFileSync('src-tauri/icons/icon.ico', finalBuffer);
console.log('Successfully wrote src-tauri/icons/icon.ico, size:', finalBuffer.length);
