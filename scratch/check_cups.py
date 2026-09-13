with open('scratch/waddle_identical_yazi.bin', 'rb') as f:
    data = f.read()

import re

# Look for CUP sequences: \x1b[<row>;<col>H around the first image display
# First image starts after 2160000
chunk = data[2160000:2175000]

# Find all \x1b[...H sequences
cups = list(re.finditer(rb'\x1b\[([0-9;]+)H', chunk))
for c in cups[:10]:
    pos = c.start()
    print('CUP:', c.group(0), 'at pos', pos)
    # count U+10EEEE between this CUP and next CUP
    next_cup = chunk.find(b'\x1b[', pos + 3)
    text_between = chunk[pos + len(c.group(0)):next_cup] if next_cup != -1 else chunk[pos:]
    ph_count = text_between.count('\U0010eeee'.encode('utf-8'))
    print(f'   -> Placeholder count after this CUP: {ph_count}, len={len(text_between)}')
