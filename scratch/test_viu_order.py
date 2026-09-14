import pty, os, select, struct, fcntl, termios, sys

def test_viu_order():
    master, slave = pty.openpty()
    winsize = struct.pack('HHHH', 24, 80, 720, 432)
    fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize)

    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.setsid()
        os.dup2(slave, 0)
        os.dup2(slave, 1)
        os.dup2(slave, 2)
        os.close(slave)
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        env['KITTY_WINDOW_ID'] = '1'
        os.execvpe('viu', ['viu', 'public/waddle-icon.png'], env)
    else:
        os.close(slave)
        output = b''
        for _ in range(50):
            r, _, _ = select.select([master], [], [], 0.1)
            if master in r:
                try:
                    data = os.read(master, 4096)
                    if not data: break
                    output += data
                    # Check if both a=q and \x1b[c are present
                    # MUST send Kitty response FIRST before DA1!
                    if b'a=q' in data:
                        idx = data.find(b'i=')
                        qid = b'1'
                        if idx != -1:
                            end = data.find(b',', idx)
                            if end != -1:
                                qid = data[idx+2:end]
                        # Send kitty response first
                        os.write(master, b'\x1b_Gi=' + qid + b';OK\x1b\\')
                    
                    if b'\x1b[c' in data or b'\x1b[0c' in data:
                        # Send DA1 response second
                        os.write(master, b'\x1b[?62c')
                    
                    if b'\x1b[5n' in data:
                        os.write(master, b'\x1b[0n')
                except OSError:
                    break
            else:
                break
        print(f"=== viu response order test ===")
        print(f"Total output bytes: {len(output)}")
        has_kitty = b'\x1b_G' in output
        has_sixel = b'\x1bP' in output or b'\x1bq' in output
        has_blocks = b'\xe2\x96\x80' in output or b'\xe2\x96\x84' in output
        print(f"Has Kitty APC (other than query): {output.count(b'\x1b_G')}")
        print(f"Has Sixel: {has_sixel}")
        print(f"Has Unicode Blocks: {has_blocks}")
        print("Prefix:", repr(output[:250]))
        print("Suffix:", repr(output[-250:]))

if __name__ == '__main__':
    test_viu_order()
