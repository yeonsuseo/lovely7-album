import re
import time
import shutil
import logging
import threading
import subprocess

logger = logging.getLogger("CloudflareTunnel")

class CloudflareTunnelManager:
    def __init__(self, local_port=8000):
        self.local_port = local_port
        self.url = None
        self.active = False
        self.running = False
        self.process = None
        self._thread = None

    def _find_cloudflared(self):
        cmd = shutil.which("cloudflared")
        return cmd if cmd else "cloudflared"

    def _run_loop(self):
        cloudflared_bin = self._find_cloudflared()
        
        while self.running:
            try:
                # Windows에서 새 창 없이 백그라운드로 안전하게 실행
                creationflags = 0
                if hasattr(subprocess, "CREATE_NO_WINDOW"):
                    creationflags = subprocess.CREATE_NO_WINDOW

                cmd = [cloudflared_bin, "tunnel", "--url", f"http://localhost:{self.local_port}"]
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    creationflags=creationflags
                )

                # stderr에서 trycloudflare.com URL 실시간 탐색
                for line in self.process.stderr:
                    if not self.running:
                        break
                    line_str = line.strip()
                    if "trycloudflare.com" in line_str:
                        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line_str)
                        if match:
                            self.url = match.group(0)
                            self.active = True
                            print(f"[Cloudflare] Zero-Password Public Tunnel Active: {self.url}")
                            break

                # 프로세스가 계속 실행 중인지 모니터링
                if self.process:
                    self.process.wait()
            except Exception as e:
                print(f"[Cloudflare] Tunnel execution notice: {e}")
            finally:
                self.active = False
            
            if not self.running:
                break
            time.sleep(3)

    def start(self):
        if self.running:
            return True
        self.running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        return True

    def stop(self):
        self.running = False
        self.active = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=2)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None

cloudflare_manager = CloudflareTunnelManager(local_port=8000)
