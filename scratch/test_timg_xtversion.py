import pty, os, select, struct, fcntl, termios, sys

def test_tool_detailed(name, cmd_args, env_override=None, xtversion=True):
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
        if env_override:
            env.update(env_override)
        os.execvpe(cmd_args[0], cmd_args, env)
    else:
        os.close(slave)
        output = b''
        for _ in range(40):
            r, _, _ = select.select([master], [], [], 0.1)
            if master in r:
                try:
                    data = os.read(master, 4096)
                    if not data: break
                    output += data
                    if b'\x1b[>q' in data or b'\x1b[>0q' in data:
                        if xtversion:
                            os.write(master, b'\x1bP>|kitty(0.35.0)\x1b\\')
                    if b'\x1b[16t' in data:
                        os.write(master, b'\x1b[6;18;9t')
                    if b'\x1b[c' in data or b'\x1b[0c' in data:
                        # DA1 response
                        os.write(master, b'\x1b[?62;4;22c')
                    if b'\x1b[?996n' in data:
                        os.write(master, b'\x1b[?996;1n')
                    if b'a=q' in data:
                        os.write(master, b'\x1b_Gi=1;OK\x1b\\')
                    if b'\x1b[5n' in data:
                        os.write(master, b'\x1b[0n')
                    if b'\x1b]11;?' in data:
                        os.write(master, b'\x1b]11;rgb:0c0c/0e0e/1414\x1b\\')
                except OSError:
                    break
            else:
                break
        print(f"=== {name} (xtversion={xtversion}) ===")
        print(f"Total output bytes: {len(output)}")
        has_kitty = b'\x1b_G' in output
        has_sixel = b'\x1bP' in output or b'\x1bq' in output
        has_blocks = b'\xe2\x96\x80' in output or b'\xe2\x96\x84' in output
        print(f"Has Kitty APC: {has_kitty}")
        print(f"Has Sixel: {has_sixel}")
        print(f"Has Unicode Blocks: {has_blocks}")
        print("Prefix:", repr(output[:250]))
        print()

if __name__ == '__main__':
    test_tool_detailed('timg (no xtversion)', ['timg', '--verbose', 'public/waddle-icon.png'], xtversion=False)
    test_tool_detailed('timg (with xtversion kitty)', ['timg', '--verbose', 'public/waddle-icon.png'], xtversion=True)
