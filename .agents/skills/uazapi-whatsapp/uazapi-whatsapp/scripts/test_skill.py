#!/usr/bin/env python3
"""
Testes da skill uazapi-whatsapp
Verifica estrutura e configurações
"""

import os
import sys

class UazapiTester:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def test(self, name, func):
        try:
            print(f"🧪 TESTE: {name}")
            result = func()
            if result:
                print(f"   ✅ PASSOU\n")
                self.passed += 1
                return True
            else:
                print(f"   ❌ FALHOU\n")
                self.failed += 1
                return False
        except Exception as e:
            print(f"   ❌ ERRO: {e}\n")
            self.errors.append(f"{name}: {e}")
            self.failed += 1
            return False
    
    def test_structure(self):
        """Verifica estrutura de diretórios"""
        required = ['scripts', 'examples', 'references']
        for d in required:
            path = os.path.join(self.base_dir, d)
            if not os.path.exists(path):
                print(f"   ❌ Diretório não encontrado: {d}")
                return False
        return True
    
    def test_skill_md(self):
        """Verifica SKILL.md"""
        path = os.path.join(self.base_dir, 'SKILL.md')
        if not os.path.exists(path):
            return False
        
        content = open(path).read()
        checks = [
            'uazapi-whatsapp' in content.lower() or 'uazapi' in content.lower(),
            '/instance/init' in content,
            '/message/sendText' in content
        ]
        return all(checks)
    
    def test_client_script(self):
        """Verifica se o cliente Python existe"""
        path = os.path.join(self.base_dir, 'scripts', 'uazapi_client.py')
        if not os.path.exists(path):
            return False
        
        content = open(path).read()
        checks = [
            'class UazAPIClient' in content,
            'create_instance' in content,
            'send_text' in content
        ]
        return all(checks)
    
    def test_examples(self):
        """Verifica exemplos"""
        curl_example = os.path.join(self.base_dir, 'examples', 'curl_examples.sh')
        fluxohub_guide = os.path.join(self.base_dir, 'examples', 'fluxohub_integration.md')
        
        if not os.path.exists(curl_example):
            print("   ⚠️  curl_examples.sh não encontrado")
        
        if not os.path.exists(fluxohub_guide):
            print("   ⚠️  fluxohub_integration.md não encontrado")
        
        return True  # Opcionais
    
    def test_references(self):
        """Verifica referências"""
        endpoints_doc = os.path.join(self.base_dir, 'references', 'api_endpoints.md')
        
        if os.path.exists(endpoints_doc):
            content = open(endpoints_doc).read()
            return '/instance/init' in content and '/message/sendText' in content
        
        print("   ⚠️  api_endpoints.md não encontrado")
        return True  # Opcional
    
    def test_env_vars(self):
        """Verifica variáveis de ambiente"""
        token = os.getenv('UAIZAPI_TOKEN')
        base_url = os.getenv('UAIZAPI_BASE_URL')
        
        if not token:
            print("   ⚠️  UAIZAPI_TOKEN não configurado (necessário para uso)")
        else:
            print(f"   ✅ UAIZAPI_TOKEN configurado ({len(token)} chars)")
        
        if base_url:
            print(f"   ✅ UAIZAPI_BASE_URL: {base_url}")
        else:
            print("   ℹ️  UAIZAPI_BASE_URL: usará padrão (https://api.uazapi.com)")
        
        return True
    
    def run_all_tests(self):
        print("="*60)
        print("🧪 TESTES DA SKILL UAZAPI-WHATSAPP")
        print("="*60)
        print()
        
        self.test("Estrutura de diretórios", self.test_structure)
        self.test("SKILL.md completo", self.test_skill_md)
        self.test("Cliente Python", self.test_client_script)
        self.test("Exemplos", self.test_examples)
        self.test("Referências", self.test_references)
        self.test("Variáveis de ambiente", self.test_env_vars)
        
        print("="*60)
        print("📊 RESUMO DOS TESTES")
        print("="*60)
        print(f"✅ Passaram: {self.passed}")
        print(f"❌ Falharam: {self.failed}")
        
        if self.errors:
            print("\n🚨 Erros:")
            for e in self.errors:
                print(f"   - {e}")
        
        print()
        print("💡 Próximo passo:")
        print("   1. Configure UAIZAPI_TOKEN")
        print("   2. Leia examples/fluxohub_integration.md")
        print("   3. Use scripts/uazapi_client.py no seu workflow")
        
        return self.failed == 0


def main():
    tester = UazapiTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
