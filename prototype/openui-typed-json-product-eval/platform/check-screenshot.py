#!/usr/bin/env python3
import binascii
import struct
import sys
import zlib


def fail(message):
    raise ValueError(message)


def paeth(left, up, upper_left):
    estimate = left + up - upper_left
    distances = (abs(estimate - left), abs(estimate - up), abs(estimate - upper_left))
    return (left, up, upper_left)[distances.index(min(distances))]


def inspect(path):
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        fail("invalid PNG signature")

    position = 8
    header = None
    compressed = []
    while position < len(data):
        if position + 12 > len(data):
            fail("truncated PNG chunk")
        length = struct.unpack(">I", data[position : position + 4])[0]
        kind = data[position + 4 : position + 8]
        payload = data[position + 8 : position + 8 + length]
        checksum = data[position + 8 + length : position + 12 + length]
        if len(payload) != length or len(checksum) != 4:
            fail("truncated PNG payload")
        if binascii.crc32(kind + payload) & 0xFFFFFFFF != struct.unpack(">I", checksum)[0]:
            fail("invalid PNG checksum")
        position += 12 + length
        if kind == b"IHDR":
            header = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            compressed.append(payload)
        elif kind == b"IEND":
            break

    if header is None or not compressed:
        fail("missing PNG image data")
    width, height, depth, color, compression, filtering, interlace = header
    if width < 320 or height < 240:
        fail("screenshot dimensions invalid")
    if (depth, color, compression, filtering, interlace) not in ((8, 2, 0, 0, 0), (8, 6, 0, 0, 0)):
        fail("unsupported PNG format")

    channels = 3 if color == 2 else 4
    stride = width * channels
    raw = zlib.decompress(b"".join(compressed))
    if len(raw) != height * (stride + 1):
        fail("invalid PNG scanline length")

    previous = bytearray(stride)
    non_white = 0
    content_pixels = 0
    near_black = 0
    sampled = 0
    top = int(height * 0.08)
    bottom = int(height * 0.9)
    for y in range(height):
        start = y * (stride + 1)
        filter_type = raw[start]
        row = bytearray(raw[start + 1 : start + 1 + stride])
        if filter_type > 4:
            fail("invalid PNG filter")
        for index, value in enumerate(row):
            left = row[index - channels] if index >= channels else 0
            up = previous[index]
            upper_left = previous[index - channels] if index >= channels else 0
            predictors = (0, left, up, (left + up) // 2, paeth(left, up, upper_left))
            row[index] = (value + predictors[filter_type]) & 0xFF
        if top <= y < bottom:
            for x in range(0, width, 4):
                offset = x * channels
                sampled += 1
                if min(row[offset : offset + 3]) < 245:
                    non_white += 1
                if max(row[offset : offset + 3]) < 220:
                    content_pixels += 1
                if max(row[offset : offset + 3]) < 20:
                    near_black += 1
        previous = row

    foreground_ratio = non_white / sampled
    content_ratio = content_pixels / sampled
    black_ratio = near_black / sampled
    if foreground_ratio < 0.01:
        fail("app viewport is visually blank")
    if content_ratio < 0.005:
        fail("app viewport has no rendered content")
    if black_ratio > 0.25:
        fail("screenshot contains an uncovered root viewport")
    return width, height, foreground_ratio, content_ratio, black_ratio


try:
    width, height, ratio, content_ratio, black_ratio = inspect(sys.argv[1])
except (IndexError, OSError, ValueError, zlib.error, struct.error) as error:
    print(error, file=sys.stderr)
    raise SystemExit(1)

print(width, height, f"{ratio:.6f}", f"{content_ratio:.6f}", f"{black_ratio:.6f}")
