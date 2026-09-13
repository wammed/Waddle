with open('scratch/real_yazi_dump.bin', 'rb') as f:
    data = f.read()

import re

# Find all APC commands
apcs = []
for m in re.finditer(rb'\x1b_G([^\x1b\x07]*)(?:\x1b\\|\x07)', data):
    apcs.append((m.start(), m.group(1)[:100]))

print(f'Total APCs: {len(apcs)}')
for pos, s in apcs[:30]:
    print(f'  at {pos}: {s.decode("latin1")}')

if len(apcs) > 30:
    print('  ...')
    for pos, s in apcs[-10:]:
        print(f'  at {pos}: {s.decode("latin1")}')
