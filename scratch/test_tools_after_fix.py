import pty, os, select, struct, fcntl, termios, subprocess

def test_tool_against_waddle(cmd_args):
    master, slave = pty.openpty()
    winsize = struct.pack('HHHH', 24, 80, 720, 432)
    fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize)

    env = os.environ.copy()
    env['TERM'] = 'xterm-kitty'
    env['KITTY_WINDOW_ID'] = '1'

    p = subprocess.Popen(cmd_args, stdin=slave, stdout=slave, stderr=slave, env=env)
    os.close(slave)

    output = b''
    for _ in range(40):
        r, _, _ = select.select([master], [], [], 0.1)
        if master in r:
            try:
                data = os.read(master, 4096)
                if not data: break
                output += data
                # Emulate Waddle's process_kitty_output responses
                # 1. a=q
                if b'a=q' in data:
                    idx = data.find(b'i=')
                    qid = b'1'
                    if idx != -1:
                        end = data.find(b',', idx)
                        if end != -1:
                            qid = data[idx+2:end]
                    os.write(master, b'\x1b_Gi=' + qid + b';OK\x1b\\')
                # 2. XTVERSION (\x1b[>q or \x1b[>0q)
                if b'\x1b[>q' in data or b'\x1b[>0q' in data:
                    os.write(master, b'\x1bP>|kitty(0.35.0)\x1b\\')
                # 3. DSR (\x1b[5n)
                if b'\x1b[5n' in data:
                    os.write(master, b'\x1b[0n')
                # 4. DA1 (\x1b[c or \x1b[0c) -> clean \x1b[?62c (NO Sixel 4!)
                if b'\x1b[c' in data or b'\x1b[0c' in data:
                    os.write(master, b'\x1b[?62c')
                # 5. Cell size (\x1b[16t)
                if b'\x1b[16t' in data:
                    os.write(master, b'\x1b[6;18;9t')
                # 6. Unicode placeholder (\x1b[?996n)
                if b'\x1b[?996n' in data:
                    os.write(master, b'\x1b[?996;1n')
            except OSError:
                break
        if p.poll() is not None:
            break

    print(f"=== {' '.join(cmd_args)} ===")
    print(f"Total output: {len(output)} bytes")
    has_kitty = b'\x1b_G' in output
    has_sixel = b'\x1bP' in output or b'\x1bq' in output
    has_blocks = b'\xe2\x96\x80' in output or b'\xe2\x96\x84' in output
    print(f"Has Kitty APC: {has_kitty}")
    print(f"Has Sixel: {has_sixel}")
    print(f"Has Unicode Blocks: {has_blocks}")
    print("Prefix:", repr(output[:200]))
    print()

if __name__ == '__main__':
    # 1. timg WITHOUT any flags (previously failed / fell back to sixel/error)
    test_tool_against_waddle(['timg', '--verbose', 'public/waddle-icon.png'])
    # 2. viu WITHOUT any flags (previously failed / used sixel)
    test_tool_against_waddle(['viu', 'public/waddle-icon.png'])
