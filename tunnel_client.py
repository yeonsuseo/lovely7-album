import socket
import threading
import time
import requests

class LocalTunnelManager:
    def __init__(self, local_port=8000, desired_subdomain="lovely7"):
        self.local_port = local_port
        self.desired_subdomain = desired_subdomain
        self.url = None
        self.subdomain = None
        self.remote_port = None
        self.tunnel_password = None
        self.running = False
        self.active = False
        self.worker_threads = []

    def fetch_password(self):
        try:
            r = requests.get("https://loca.lt/mytunnelpassword", timeout=5)
            if r.status_code == 200 and r.text.strip():
                self.tunnel_password = r.text.strip()
                return self.tunnel_password
        except Exception as e:
            print(f"[Tunnel] Error getting password: {e}")
        self.tunnel_password = "211.108.237.138"
        return self.tunnel_password

    def register_subdomain(self):
        # 반드시 사용자가 요청한 lovely7 고정 도메인을 획득하도록 집중 시도
        headers = {"Accept": "application/json"}
        for attempt in range(50):
            try:
                res = requests.get(f"http://localtunnel.me/{self.desired_subdomain}", headers=headers, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("id") == self.desired_subdomain:
                        self.url = (data.get("url") or "").replace("https://", "http://")
                        self.subdomain = data.get("id")
                        self.remote_port = data.get("port")
                        print(f"[Tunnel] Successfully registered exact tunnel: {self.url} (remote port: {self.remote_port})")
                        return True
                    else:
                        print(f"[Tunnel] Attempt {attempt+1}: '{self.desired_subdomain}' temporarily busy (got {data.get('id')}), retrying exact name in 2s...")
                        time.sleep(2.0)
            except Exception as e:
                print(f"[Tunnel] Attempt {attempt+1} for '{self.desired_subdomain}' failed: {e}")
                time.sleep(2.0)

        return False

    def _forward_stream(self, src, dst):
        try:
            while self.running:
                data = src.recv(16384)
                if not data:
                    break
                dst.sendall(data)
        except Exception:
            pass
        finally:
            try:
                src.close()
            except Exception:
                pass
            try:
                dst.close()
            except Exception:
                pass

    def _worker(self):
        fail_count = 0
        while self.running:
            rem_sock = None
            loc_sock = None
            try:
                # 1. Connect to localtunnel.me broker port
                rem_sock = socket.create_connection(("localtunnel.me", self.remote_port), timeout=15)
                fail_count = 0
                
                # 2. Wait for incoming HTTP request chunk from remote client
                rem_sock.settimeout(60)
                first_chunk = rem_sock.recv(16384)
                if not first_chunk:
                    try: rem_sock.close()
                    except Exception: pass
                    continue

                # 3. Connect to local FastAPI server and forward first chunk
                loc_sock = socket.create_connection(("127.0.0.1", self.local_port), timeout=5)
                loc_sock.sendall(first_chunk)

                # 4. Spin up bi-directional forward threads
                t1 = threading.Thread(target=self._forward_stream, args=(rem_sock, loc_sock), daemon=True)
                t2 = threading.Thread(target=self._forward_stream, args=(loc_sock, rem_sock), daemon=True)
                t1.start()
                t2.start()

                t1.join()
                t2.join()
            except (ConnectionRefusedError, socket.gaierror, TimeoutError):
                fail_count += 1
                if fail_count >= 5:
                    print(f"[Tunnel] Broker connection failed 5 times, re-registering {self.desired_subdomain}...")
                    self.register_subdomain()
                    fail_count = 0
                time.sleep(1.5)
            except Exception:
                time.sleep(0.5)
            finally:
                if rem_sock:
                    try: rem_sock.close()
                    except Exception: pass
                if loc_sock:
                    try: loc_sock.close()
                    except Exception: pass

    def start(self, pool_size=16):
        def _runner():
            self.running = True
            self.fetch_password()
            while self.running:
                success = self.register_subdomain()
                if success:
                    self.active = True
                    for _ in range(pool_size):
                        t = threading.Thread(target=self._worker, daemon=True)
                        t.start()
                        self.worker_threads.append(t)
                    break
                else:
                    print(f"[Tunnel] Subdomain '{self.desired_subdomain}' still busy, retrying in 3s...")
                    time.sleep(3)
        threading.Thread(target=_runner, daemon=True).start()
        return True

    def stop(self):
        self.running = False
        self.active = False

tunnel_manager = LocalTunnelManager(local_port=8000, desired_subdomain="lovely7")
