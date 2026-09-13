import os
import pty
import select
import time
import subprocess

# Run yazi directly without dummy responders, exactly like Waddle's PTY environment
master, slave = pty.openpty()

env = os.environ.copy()
env["TERM"] = "xterm-256color"
env["COLORTERM"] = "truecolor"
env["WADDLE_TERMINAL"] = "1"
env["KITTY_WINDOW_ID"] = "1"
env["COLUMNS"] = "120"
env["LINES"] = "35"

pid = os.fork()
if pid == 0:
    os.close(master)
    os.setsid()
    os.dup2(slave, 0)
    os.dup2(slave, 1)
    os.dup2(slave, 2)
    os.close(slave)
    # Target directory contains waddle-icon.png
    os.execvpe("yazi", ["yazi", "/home/susie/GitHUB/wammed/Waddle/public"], env)
else:
    os.close(slave)
    captured = bytearray()
    start_time = time.time()
    try:
        while time.time() - start_time < 3.0:
            r, _, _ = select.select([master], [], [], 0.05)
            if master in r:
                data = os.read(master, 16384)
                if not data:
                    break
                captured.extend(data)
                
                # Check what yazi sends when PTY does NOT have dummy responses
                if b"\x1b_G" in data:
                    print("Received Kitty APC from yazi:", data[:100])
                if b"\x1b[" in data:
                    # check for queries
                    for q in [b"\x1b[c", b"\x1b[0c", b"\x1b[16t", b"\x1b[14t", b"\x1b[18t", b"\x1b[?996n", b"\x1b[6n"]:
                        if q in data:
                            print("Received query from yazi:", q)
            elapsed = time.time() - start_time
            if 1.0 < elapsed < 1.1:
                # Down arrow to select image
                os.write(master, b"\x1b[B\x1b[B\x1b[B")
            if 2.0 < elapsed < 2.1:
                os.write(master, b"q")
    finally:
        os.close(master)
        try:
            os.kill(pid, 9)
        except:
            pass

print(f"Total captured without responses: {len(captured)} bytes")
with open("scratch/raw_yazi_no_mock.bin", "wb") as f:
    f.write(captured)
