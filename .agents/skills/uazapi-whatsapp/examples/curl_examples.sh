#!/bin/bash
# ============================================================
# Exemplos de uso da UazAPI com curl
# ============================================================

# Configurações
BASE_URL="https://api.uazapi.com"
ADMIN_TOKEN="seu_admin_token_aqui"
INSTANCE_TOKEN="token_da_instancia_aqui"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=================================="
echo "UazAPI - Exemplos com curl"
echo "=================================="
echo ""

# ============================================================
# 1. GERENCIAMENTO DE INSTÂNCIAS
# ============================================================

echo -e "${GREEN}1. Criar Instância${NC}"
curl -X POST "${BASE_URL}/instance/init" \
  -H "Content-Type: application/json" \
  -H "admintoken: ${ADMIN_TOKEN}" \
  -d '{
    "instanceName": "minha-instancia"
  }' | jq .

echo ""
echo -e "${GREEN}2. Conectar (Gerar QR Code)${NC}"
curl -X POST "${BASE_URL}/instance/connect" \
  -H "Content-Type: application/json" \
  -H "token: ${INSTANCE_TOKEN}" \
  -d '{}' | jq .

echo ""
echo -e "${GREEN}3. Ver Status${NC}"
curl -X GET "${BASE_URL}/instance/status" \
  -H "token: ${INSTANCE_TOKEN}" | jq .

echo ""
echo -e "${GREEN}4. Listar Todas as Instâncias${NC}"
curl -X GET "${BASE_URL}/instance/all" \
  -H "admintoken: ${ADMIN_TOKEN}" | jq .

echo ""
echo -e "${GREEN}5. Desconectar${NC}"
curl -X POST "${BASE_URL}/instance/disconnect" \
  -H "token: ${INSTANCE_TOKEN}" | jq .

# ============================================================
# 2. ENVIO DE MENSAGENS
# ============================================================

PHONE="5511999999999"  # DDI + DDD + Número

echo ""
echo -e "${GREEN}6. Enviar Texto${NC}"
curl -X POST "${BASE_URL}/message/sendText" \
  -H "Content-Type: application/json" \
  -H "token: ${INSTANCE_TOKEN}" \
  -d "{
    \"phone\": \"${PHONE}\",
    \"message\": \"Olá! 👋 Esta é uma mensagem de teste do FluxoHub\",
    \"delay\": 1000,
    \"readchat\": true
  }" | jq .

echo ""
echo -e "${GREEN}7. Enviar Imagem${NC}"
curl -X POST "${BASE_URL}/message/sendImage" \
  -H "Content-Type: application/json" \
  -H "token: ${INSTANCE_TOKEN}" \
  -d "{
    \"phone\": \"${PHONE}\",
    \"image\": \"https://via.placeholder.com/300x200.png?text=FluxoHub\",
    \"caption\": \"Veja esta imagem! 🖼️\",
    \"delay\": 1000
  }" | jq .

echo ""
echo -e "${GREEN}8. Enviar Documento${NC}"
curl -X POST "${BASE_URL}/message/sendDocument" \
  -H "Content-Type: application/json" \
  -H "token: ${INSTANCE_TOKEN}" \
  -d "{
    \"phone\": \"${PHONE}\",
    \"document\": \"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf\",
    \"fileName\": \"documento.pdf\",
    \"caption\": \"Segue o documento solicitado 📄\",
    \"delay\": 1000
  }" | jq .

echo ""
echo -e "${GREEN}9. Enviar Menu/Botões${NC}"
curl -X POST "${BASE_URL}/send/menu" \
  -H "Content-Type: application/json" \
  -H "token: ${INSTANCE_TOKEN}" \
  -d "{
    \"phone\": \"${PHONE}\",
    \"message\": \"Escolha uma opção:\",
    \"type\": \"button\",
    \"buttons\": [
      {\"buttonId\": \"1\", \"buttonText\": \"📋 Ver serviços\"},
      {\"buttonId\": \"2\", \"buttonText\": \"💰 Preços\"},
      {\"buttonId\": \"3\", \"buttonText\": \"📞 Falar com atendente\"}
    ],
    \"delay\": 1000
  }" | jq .

echo ""
echo "=================================="
echo "Exemplos concluídos!"
echo "=================================="
