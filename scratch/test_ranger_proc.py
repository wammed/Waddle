import pty, os, select, struct, fcntl, termios, subprocess

master, slave = pty.openpty()
winsize = struct.pack('HHHH', 24, 80, 720, 432)
fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize)

env = os.environ.copy()
env['TERM'] = 'xterm-kitty'
env['KITTY_WINDOW_ID'] = '1'

code = '''
import sys, os, traceback
from ranger.ext.img_display import KittyImageDisplayer
try:
    disp = KittyImageDisplayer()
    disp.draw("public/waddle-icon.png", 10, 5, 30, 15)
    print("DRAW_FINISHED_SUCCESS")
except Exception:
    traceback.print_exc()
'''

p = subprocess.Popen(['python3', '-c', code], stdin=slave, stdout=slave, stderr=slave, env=env)
os.close(slave)

output = b''
for _ in range(30):
    r, _, _ = select.select([master], [], [], 0.2)
    if master in r:
        try:
            d = os.read(master, 4096)
            if not d: break
            output += d
            print('CHILD SENT:', repr(d[:200]))
            if b'a=q' in d:
                os.write(master, b'\x1b_Gi=1;OK\x1b\\')
                print('REPLIED a=q')
            if b'a=T' in d:
                os.write(master, b'\x1b_Gi=1;OK\x1b\\')
                print('REPLIED a=T')
        except OSError:
            break
    if p.poll() is not None:
        break

print('EXIT CODE:', p.poll())
