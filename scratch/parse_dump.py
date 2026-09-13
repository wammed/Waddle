with open('scratch/real_yazi_dump.bin', 'rb') as f:
    data = f.read()

print('Total bytes:', len(data))

# Find 'm=0;' in data
m0_pos = data.find(b'm=0;')
print('m=0; pos:', m0_pos)
if m0_pos != -1:
    # Find end of this APC
    apc_end1 = data.find(b'\x1b\\', m0_pos)
    apc_end2 = data.find(b'\x07', m0_pos)
    ends = [e for e in [apc_end1, apc_end2] if e != -1]
    if ends:
        end_pos = min(ends)
        print('End of m=0 APC at:', end_pos)
        print('Next 500 bytes:')
        print(repr(data[end_pos:end_pos+500]))
