with open('scratch/waddle_identical_yazi.bin', 'rb') as f:
    data = f.read()

print('Total bytes captured:', len(data))
idx = 0
count = 0
while True:
    pos = data.find(b'\x1b_G', idx)
    if pos == -1:
        break
    semi = data.find(b';', pos)
    end1 = data.find(b'\x1b\\', pos)
    end2 = data.find(b'\x07', pos)
    ends = [e for e in [end1, end2] if e != -1]
    if not ends:
        break
    end = min(ends)
    header_end = semi if (semi != -1 and semi < end) else end
    header = data[pos+3:header_end]
    if b'a=' in header or b'm=0' in header or count < 10:
        print(f'APC #{count} at {pos}: {header}')
    idx = end + 1
    count += 1
    if count > 800:
        break

print(f'Total APCs: {count}')
