with open('scratch/waddle_identical_yazi.bin', 'rb') as f:
    data = f.read()

import re
chunk = data[2160000:2175000]
cups = list(re.finditer(rb'\x1b\[([0-9;]+)H', chunk))
print(f'Total CUPs: {len(cups)}')
for c in cups:
    pos = c.start()
    next_cup = chunk.find(b'\x1b[', pos + 3)
    text_between = chunk[pos + len(c.group(0)):next_cup] if next_cup != -1 else chunk[pos:]
    ph_count = text_between.count('\U0010eeee'.encode('utf-8'))
    print(f'{c.group(0).decode()}: ph={ph_count}')
