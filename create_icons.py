import os
import struct
import zlib
import math

def create_png(width, height, get_pixel_fn):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_fn(x, y, width, height)
            raw_data.extend([r, g, b, a])

    def chunk(chunk_type, data):
        length = struct.pack('>I', len(data))
        crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return length + chunk_type + data + crc

    png = bytearray(b'\x89PNG\r\n\x1a\n')
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png.extend(chunk(b'IHDR', ihdr_data))
    png.extend(chunk(b'IDAT', zlib.compress(bytes(raw_data), 9)))
    png.extend(chunk(b'IEND', b''))
    return bytes(png)

def gemini_sparkle_pixel(x, y, w, h):
    # Normalized coords (-1.0 to 1.0)
    nx = (x - (w - 1) / 2.0) / ((w - 1) / 2.0)
    ny = (y - (h - 1) / 2.0) / ((h - 1) / 2.0)

    # Rounded background square
    corner_r = 0.3
    dx = max(0, abs(nx) - (1.0 - corner_r))
    dy = max(0, abs(ny) - (1.0 - corner_r))
    dist_corner = math.sqrt(dx*dx + dy*dy)
    if dist_corner > corner_r:
        return 0, 0, 0, 0  # transparent

    # Star math (astroid / 4-pointed star curve: |x|^0.5 + |y|^0.5 <= 1.0)
    # Scale star slightly
    sx = abs(nx) / 0.78
    sy = abs(ny) / 0.78

    is_star = False
    if sx < 1.0 and sy < 1.0:
        val = math.sqrt(sx) + math.sqrt(sy)
        if val <= 1.0:
            is_star = True

    # Color gradient: Top-left blue (#4285F4) to bottom-right purple/coral (#9B72CF -> #D96570)
    t = (nx + ny + 2.0) / 4.0
    t = max(0.0, min(1.0, t))

    # Background color: subtle dark navy/slate
    bg_r = int(24 + 10 * t)
    bg_g = int(26 + 10 * t)
    bg_b = int(32 + 15 * t)

    if is_star:
        # Star gradient: Bright white-blue to soft purple
        sr = int(66 + (217 - 66) * t)
        sg = int(133 + (101 - 133) * t)
        sb = int(244 + (112 - 244) * t)
        return sr, sg, sb, 255
    else:
        # Subtle glow near center
        center_dist = math.sqrt(nx*nx + ny*ny)
        if center_dist < 0.85:
            glow = max(0.0, 1.0 - center_dist / 0.85) * 0.25
            r = int(bg_r * (1 - glow) + 100 * glow)
            g = int(bg_g * (1 - glow) + 140 * glow)
            b = int(bg_b * (1 - glow) + 240 * glow)
            return r, g, b, 255
        return bg_r, bg_g, bg_b, 255

def main():
    os.makedirs('icons', exist_ok=True)
    sizes = [16, 32, 48, 128]
    for s in sizes:
        png_bytes = create_png(s, s, gemini_sparkle_pixel)
        filename = os.path.join('icons', f'icon{s}.png')
        with open(filename, 'wb') as f:
            f.write(png_bytes)
        print(f"Generated {filename} ({len(png_bytes)} bytes)")

if __name__ == '__main__':
    main()
