import pty, os, select, struct, fcntl, termios, sys, traceback

def test_ranger():
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
        os.environ['TERM'] = 'xterm-kitty'
        os.environ['KITTY_WINDOW_ID'] = '1'
        
        try:
            from ranger.ext.img_display import KittyImageDisplayer
            KittyImageDisplayer.stdbin = open(0, 'rb', buffering=0)
            KittyImageDisplayer.stdbout = open(1, 'wb', buffering=0)
            disp = KittyImageDisplayer()
            disp.draw('public/waddle-icon.png', 10, 5, 30, 15)
            print("DRAW_SUCCESS!!")
        except Exception as e:
            traceback.print_exc()
        sys.exit(0)
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
                    if b'a=q' in data:
                        idx = data.find(b'i=')
                        qid = b'1'
                        if idx != -1:
                            end = data.find(b',', idx)
                            if end != -1:
                                qid = data[idx+2:end]
                        os.write(master, b'\x1b_Gi=' + qid + b';OK\x1b\\')
                    elif b'a=T' in data:
                        idx = data.find(b'i=')
                        qid = b'1'
                        if idx != -1:
                            end = data.find(b',', idx)
                            if end != -1:
                                qid = data[idx+2:end]
                        os.write(master, b'\x1b_Gi=' + qid + b';OK\x1b\\')
                except OSError:
                    break
            else:
                break
        print(output.decode('utf-8', errors='replace'))

if __name__ == '__main__':
    test_ranger()
