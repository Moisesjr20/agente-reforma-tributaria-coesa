#!/usr/bin/env python3
"""
Cliente Python para UazAPI (WhatsApp)
Wrapper completo para todos os endpoints
"""

import os
import requests
from typing import Optional, Dict, List, Union


# Carrega .env se as variáveis não estiverem no ambiente
def _load_env():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Sobe: scripts/ -> uazapi-whatsapp/ -> skills/ -> .agents/ -> project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(script_dir))))
    env_file = os.path.join(project_root, ".env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip())

_load_env()


class UazAPIClient:
    """
    Cliente para integração com UazAPI (WhatsApp API)
    
    Uso:
        client = UazAPIClient(
            base_url="https://api.uazapi.com",
            admin_token="seu_admin_token"
        )
        
        # Criar instância
        instance = client.create_instance("minha-instancia")
        
        # Conectar
        qr = client.connect(instance['token'])
        
        # Enviar mensagem
        client.send_text(instance['token'], "5511999999999", "Olá!")
    """
    
    def __init__(self, base_url: str = None, admin_token: str = None):
        """
        Inicializa o cliente
        
        Args:
            base_url: URL base da API (default: https://api.uazapi.com)
            admin_token: Token de administrador para criar instâncias
        """
        self.base_url = base_url or os.getenv("UAIZAPI_BASE_URL", "https://api.uazapi.com")
        self.admin_token = admin_token or os.getenv("UAIZAPI_TOKEN")
        
        if not self.admin_token:
            raise ValueError("Admin token é obrigatório. Configure UAIZAPI_TOKEN.")
        
        self.session = requests.Session()
    
    def _request(self, method: str, endpoint: str, token: str = None, 
                 data: dict = None, params: dict = None, admin: bool = False) -> dict:
        """
        Faz requisição para a API
        
        Args:
            method: HTTP method (GET, POST, etc)
            endpoint: Endpoint da API (ex: /instance/init)
            token: Token da instância (ou None para endpoints admin)
            data: Body da requisição
            params: Query params
            admin: Se True, usa admin_token no header admintoken
        """
        url = f"{self.base_url}{endpoint}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Autenticação
        if admin:
            headers["admintoken"] = self.admin_token
        elif token:
            headers["token"] = token
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=90
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            raise Exception(f"Erro na requisição: {e}")
    
    # ============================================================
    # GERENCIAMENTO DE INSTÂNCIAS
    # ============================================================
    
    def create_instance(self, instance_name: str, token: str = None) -> dict:
        """
        Cria uma nova instância do WhatsApp
        
        Args:
            instance_name: Nome da instância
            token: Token personalizado (opcional, gera automaticamente se não informado)
        
        Returns:
            dict: Dados da instância criada
        """
        data = {"instanceName": instance_name}
        if token:
            data["token"] = token
        
        return self._request("POST", "/instance/init", data=data, admin=True)
    
    def connect(self, instance_token: str, phone: str = None) -> dict:
        """
        Gera QR code ou código de pareamento para conectar instância
        
        Args:
            instance_token: Token da instância
            phone: Número de telefone para código de pareamento (opcional)
        
        Returns:
            dict: Contém qrcode ou pairCode
        """
        data = {}
        if phone:
            data["phone"] = phone
        
        return self._request("POST", "/instance/connect", 
                           token=instance_token, data=data)
    
    def get_status(self, instance_token: str) -> dict:
        """
        Obtém status da instância
        
        Args:
            instance_token: Token da instância
        
        Returns:
            dict: Status (disconnected, connecting, connected)
        """
        return self._request("GET", "/instance/status", token=instance_token)
    
    def disconnect(self, instance_token: str) -> dict:
        """
        Desconecta a instância
        
        Args:
            instance_token: Token da instância
        """
        return self._request("POST", "/instance/disconnect", token=instance_token)
    
    def list_instances(self) -> List[dict]:
        """
        Lista todas as instâncias
        
        Returns:
            list: Lista de instâncias
        """
        return self._request("GET", "/instance/all", admin=True)
    
    def update_instance_name(self, instance_token: str, new_name: str) -> dict:
        """
        Atualiza o nome da instância
        """
        return self._request("POST", "/instance/updateInstanceName",
                           token=instance_token, data={"instanceName": new_name})
    
    def delete_instance(self, instance_token: str) -> dict:
        """
        Deleta a instância
        """
        return self._request("DELETE", "/instance/delete", token=instance_token)
    
    # ============================================================
    # ENVIO DE MENSAGENS
    # ============================================================
    
    def send_text(self, instance_token: str, phone: str, message: str,
                  delay: int = 1000, readchat: bool = True) -> dict:
        """
        Envia mensagem de texto
        
        Args:
            instance_token: Token da instância
            phone: Número do destinatário (DDI + DDD + Número)
            message: Texto da mensagem
            delay: Delay em ms antes de enviar (padrão: 1000)
            readchat: Marcar chat como lido (padrão: True)
        """
        data = {
            "phone": phone,
            "message": message,
            "delay": delay,
            "readchat": readchat
        }
        
        return self._request("POST", "/message/sendText",
                           token=instance_token, data=data)
    
    def send_image(self, instance_token: str, phone: str, image_url: str,
                   caption: str = "", delay: int = 1000) -> dict:
        """
        Envia imagem por URL
        
        Args:
            image_url: URL da imagem (deve ser pública)
            caption: Legenda da imagem
        """
        data = {
            "phone": phone,
            "image": image_url,
            "caption": caption,
            "delay": delay
        }
        
        return self._request("POST", "/message/sendImage",
                           token=instance_token, data=data)
    
    def send_document(self, instance_token: str, phone: str, document_url: str,
                     file_name: str, caption: str = "", delay: int = 1000) -> dict:
        """
        Envia documento por URL
        
        Args:
            document_url: URL do documento
            file_name: Nome do arquivo
            caption: Legenda
        """
        data = {
            "phone": phone,
            "document": document_url,
            "fileName": file_name,
            "caption": caption,
            "delay": delay
        }
        
        return self._request("POST", "/message/sendDocument",
                           token=instance_token, data=data)
    
    def send_audio(self, instance_token: str, phone: str, audio_url: str,
                  delay: int = 1000) -> dict:
        """
        Envia arquivo de áudio
        
        Args:
            audio_url: URL do áudio (MP3, OGG)
        """
        data = {
            "phone": phone,
            "audio": audio_url,
            "delay": delay
        }
        
        return self._request("POST", "/message/sendAudio",
                           token=instance_token, data=data)
    
    def send_video(self, instance_token: str, phone: str, video_url: str,
                  caption: str = "", delay: int = 1000) -> dict:
        """
        Envia vídeo
        
        Nota: Limite de 16MB
        """
        data = {
            "phone": phone,
            "video": video_url,
            "caption": caption,
            "delay": delay
        }
        
        return self._request("POST", "/message/sendVideo",
                           token=instance_token, data=data)
    
    def send_buttons(self, instance_token: str, phone: str, message: str,
                    buttons: List[dict], delay: int = 1000) -> dict:
        """
        Envia mensagem com botões
        
        Args:
            buttons: Lista de botões [{"buttonId": "1", "buttonText": "Texto"}]
        
        Nota: Pode não funcionar se o número estiver logado no WhatsApp Web
        """
        data = {
            "phone": phone,
            "message": message,
            "type": "button",
            "buttons": buttons,
            "delay": delay
        }
        
        return self._request("POST", "/send/menu",
                           token=instance_token, data=data)
    
    def send_list(self, instance_token: str, phone: str, message: str,
                 sections: List[dict], button_text: str = "Ver opções",
                 delay: int = 1000) -> dict:
        """
        Envia mensagem com lista de opções
        
        Args:
            sections: Lista de seções com opções
            button_text: Texto do botão para abrir a lista
        """
        data = {
            "phone": phone,
            "message": message,
            "type": "list",
            "buttonText": button_text,
            "sections": sections,
            "delay": delay
        }
        
        return self._request("POST", "/send/menu",
                           token=instance_token, data=data)
    
    # ============================================================
    # MÉTODOS ÚTEIS
    # ============================================================
    
    def is_connected(self, instance_token: str) -> bool:
        """
        Verifica se a instância está conectada
        
        Returns:
            bool: True se estiver connected
        """
        try:
            status = self.get_status(instance_token)
            return status.get("state") == "connected"
        except:
            return False
    
    def send_message_safe(self, instance_token: str, phone: str, 
                         message: str, max_retries: int = 3) -> dict:
        """
        Envia mensagem com retry automático
        
        Args:
            max_retries: Número máximo de tentativas
        """
        import time
        
        for attempt in range(max_retries):
            try:
                return self.send_text(instance_token, phone, message)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
        
        return None


# ============================================================
# EXEMPLO DE USO
# ============================================================

if __name__ == "__main__":
    import os
    
    # Configurar
    token = os.getenv("UAIZAPI_TOKEN")
    
    if not token:
        print("Configure UAIZAPI_TOKEN")
        exit(1)
    
    client = UazAPIClient(admin_token=token)
    
    # Exemplo: Criar instância
    print("Criando instância...")
    instance = client.create_instance("fluxohub-demo")
    print(f"Instância criada: {instance}")
    
    # Exemplo: Ver status
    print("\nVerificando status...")
    status = client.get_status(instance['token'])
    print(f"Status: {status}")
