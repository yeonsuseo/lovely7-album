import time
from pyngrok import ngrok, conf

class NgrokTunnelManager:
    def __init__(self, local_port=8000, auth_token="3J7AMGzVVJMPYGNkqeEsCiJ1MDD_7ATvsrFbmZmqpfCh7h6Z1", domain="trimness-thirsty-culminate.ngrok-free.dev"):
        self.local_port = local_port
        self.auth_token = auth_token
        self.domain = domain
        self.url = f"https://{domain}"
        self.active = False
        self.tunnel = None

    def start(self):
        try:
            conf.get_default().auth_token = self.auth_token
            self.tunnel = ngrok.connect(self.local_port, domain=self.domain)
            self.url = self.tunnel.public_url
            self.active = True
            print(f"[ngrok] Permanent Static Tunnel Active: {self.url}")
            return True
        except Exception as e:
            print(f"[ngrok] Error starting tunnel: {e}")
            self.active = False
            return False

    def stop(self):
        try:
            if self.tunnel:
                ngrok.disconnect(self.tunnel.public_url)
            ngrok.kill()
        except Exception:
            pass
        self.active = False

ngrok_manager = NgrokTunnelManager()
