import pty, os, select, sys, termios, struct, fcntl, time

master, slave = pty.openpty()
winsize = struct.pack("HHHH", 24, 80, 720, 432)
fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize)

pid = os.fork()
if pid == 0:
    os.close(master)
    os.setsid()
    fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
    os.dup2(slave, 0)
    os.dup2(slave, 1)
    os.dup2(slave, 2)
    if slave > 2:
        os.close(slave)
    os.execvp("kitten", ["kitten", "icat", "/home/susie/Downloads/bye-bye.gif"])
    os._exit(1)

os.close(slave)

out = []
start = time.time()
while time.time() - start < 3:
    r, _, _ = select.select([master], [], [], 0.05)
    if master in r:
        try:
            chunk = os.read(master, 16384)
            if not chunk:
                break
            out.append(chunk)
            if b"a=q" in chunk:
                import re
                for m in re.finditer(rb"i=(\d+)", chunk):
                    iid = m.group(1)
                    if iid in (b"1", b"2"):
                        os.write(master, b"\x1b_Gi=" + iid + b";OK\x1b\\")
            if b"\x1b[c" in chunk:
                os.write(master, b"\x1b[?62;4;22c")
        except OSError:
            break

sys.stdout.buffer.write(b"".join(out))
