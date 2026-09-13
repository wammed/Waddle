import os
import pty
import select
import time
import re

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
        while time.time() - start_time < 6.0:
            r, _, _ = select.select([master], [], [], 0.05)
            if master in r:
                data = os.read(master, 16384)
                if not data:
                    break
                captured.extend(data)
                
                # Check for Kitty query probes
                for m in re.finditer(b"\x1b_G([^\x1b\x07]+)[\x1b\\\\\x07]", data):
                    hdr = m.group(1).decode('ascii', errors='ignore')
                    if "a=q" in hdr or "a=Q" in hdr:
                        id_m = re.search(r"[iI]=(\d+)", hdr)
                        qid = id_m.group(1) if id_m else "1"
                        if "t=s" in hdr:
                            resp = f"\x1b_Gi={qid};ENOTSUP\x1b\\".encode('ascii')
                        else:
                            resp = f"\x1b_Gi={qid};OK\x1b\\".encode('ascii')
                        os.write(master, resp)
                        print(f"Responded to query: {resp}")

                # Also respond to DA1 (\x1b[c) and cell size queries (\x1b[16t)
                if b"\x1b[c" in data or b"\x1b[0c" in data:
                    os.write(master, b"\x1b[?62;4;22c")
                if b"\x1b[16t" in data:
                    os.write(master, b"\x1b[6;18;9t")
                if b"\x1b[?996n" in data:
                    os.write(master, b"\x1b[?996;1n")

            # After 1.5s, send down arrows to select png files in public directory
            elapsed = time.time() - start_time
            if 1.5 < elapsed < 1.6:
                os.write(master, b"\x1b[B\x1b[B\x1b[B") # Down 3 times to waddle-icon.png
            if 4.5 < elapsed < 4.6:
                os.write(master, b"q") # Quit yazi
    except Exception as e:
        print("Error:", e)
    finally:
        os.close(master)
        try:
            os.kill(pid, 9)
        except:
            pass

with open("scratch/real_yazi_dump.bin", "wb") as f:
    f.write(captured)
print(f"Captured {len(captured)} bytes from real yazi!")
