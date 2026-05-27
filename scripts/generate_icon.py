#!/usr/bin/env python3
"""Generate favicon.ico for the Windows installer."""
import struct
import zlib
import os

def create_png(width, height, color=(0x16, 0x77, 0xff)):
    """Create a minimal PNG icon."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            raw += bytes(color)

    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def create_ico(output_path):
    """Create .ico file with multiple sizes."""
    sizes = [16, 32, 48, 64]
    pngs = []
    for s in sizes:
        png_data = create_png(s, s)
        pngs.append((s, png_data))

    num_images = len(pngs)
    header = struct.pack('<HHH', 0, 1, num_images)

    offset = 6 + num_images * 16
    data = b''

    for i, (size, png_data) in enumerate(pngs):
        entry = struct.pack('<BBBBHHII',
            size, size, 0, 0,
            1, 32,
            len(png_data), offset
        )
        data += entry
        offset += len(png_data)

    data = header + data
    for _, png_data in pngs:
        data += png_data

    with open(output_path, 'wb') as f:
        f.write(data)

    print(f"[OK] Created {output_path} ({len(data)} bytes, {len(pngs)} sizes: {[s for s, _ in pngs]})")

if __name__ == '__main__':
    output = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'favicon.ico')
    create_ico(output)
