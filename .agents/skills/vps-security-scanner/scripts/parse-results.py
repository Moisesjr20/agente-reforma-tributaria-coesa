#!/usr/bin/env python3
"""
VPS Security Scanner - Result Parser
Processa outputs dos scans e gera relatório Markdown estruturado
"""
import os
import sys
import re
from datetime import datetime
from typing import Dict, List

class Finding:
    def __init__(self, id: str, severity: str, category: str, title: str, 
                 evidence: str, impact: str, recommendation: str):
        self.id = id
        self.severity = severity
        self.category = category
        self.title = title
        self.evidence = evidence
        self.impact = impact
        self.recommendation = recommendation

def parse_ssh_config(file_path: str) -> List[Finding]:
    """Analisa configuração SSH e retorna findings"""
    findings = []
    
    if not os.path.exists(file_path):
        return findings
    
    with open(file_path, 'r') as f:
        config = f.read()
    
    # Check PermitRootLogin
    if re.search(r'^PermitRootLogin\s+yes', config, re.MULTILINE):
        findings.append(Finding(
            id='C-001',
            severity='critical',
            category='Unauthorized Access',
            title='Root Login Habilitado via SSH',
            evidence='/etc/ssh/sshd_config: PermitRootLogin yes',
            impact='Permite acesso direto como root se senha for comprometida',
            recommendation="sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl restart sshd"
        ))
    
    # Check PasswordAuthentication
    if re.search(r'^PasswordAuthentication\s+yes', config, re.MULTILINE):
        findings.append(Finding(
            id='H-001',
            severity='high',
            category='Authentication',
            title='Autenticação por Senha Habilitada',
            evidence='/etc/ssh/sshd_config: PasswordAuthentication yes',
            impact='Aumenta superfície de ataque para brute force',
            recommendation="sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart sshd"
        ))
    
    # Check Port 22
    if not re.search(r'^Port\s+(\d+)', config, re.MULTILINE) or \
       re.search(r'^Port\s+22$', config, re.MULTILINE):
        findings.append(Finding(
            id='M-001',
            severity='medium',
            category='Network Security',
            title='SSH na Porta Padrão (22)',
            evidence='/etc/ssh/sshd_config: Port 22 (ou não especificado)',
            impact='Facilita descoberta por scanners automatizados',
            recommendation="Alterar para porta não-padrão (ex: Port 2222)"
        ))
    
    return findings

def parse_nmap(file_path: str) -> List[Finding]:
    """Analisa resultado do nmap e detecta portas abertas"""
    findings = []
    
    if not os.path.exists(file_path):
        return findings
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Portas perigosas expostas
    dangerous_ports = {
        '3306': ('MySQL', 'high'),
        '5432': ('PostgreSQL', 'high'),
        '6379': ('Redis', 'high'),
        '27017': ('MongoDB', 'high'),
        '21': ('FTP', 'high'),
        '23': ('Telnet', 'critical'),
        '25': ('SMTP', 'medium'),
    }
    
    for port, (service, severity) in dangerous_ports.items():
        if re.search(rf'{port}/tcp\s+open', content):
            findings.append(Finding(
                id=f'H-{port}',
                severity=severity,
                category='Network Exposure',
                title=f'Porta {port} ({service}) Exposta',
                evidence=f'nmap detectou {port}/tcp open',
                impact=f'{service} acessível publicamente → risco de acesso não autorizado',
                recommendation=f'Fechar porta {port} ou restringir por firewall (ufw deny {port}/tcp)'
            ))
    
    return findings

def parse_trivy(file_path: str) -> List[Finding]:
    """Analisa CVEs do Trivy"""
    findings = []
    
    if not os.path.exists(file_path):
        return findings
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Conta CVEs CRITICAL e HIGH
    critical_count = len(re.findall(r'CRITICAL', content))
    high_count = len(re.findall(r'HIGH', content))
    
    if critical_count > 0 or high_count > 0:
        findings.append(Finding(
            id='C-002',
            severity='critical' if critical_count > 0 else 'high',
            category='Known Vulnerabilities',
            title=f'{critical_count} CVEs Críticas + {high_count} High em Containers Docker',
            evidence='Veja output completo do trivy',
            impact='Containers contêm pacotes com vulnerabilidades conhecidas',
            recommendation='Atualizar imagens Docker para última versão estável'
        ))
    
    return findings

def parse_users(file_path: str) -> List[Finding]:
    """Analisa contas de usuário suspeitas"""
    findings = []
    
    if not os.path.exists(file_path):
        return findings
    
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Detecta múltiplos UID 0
    uid_zero_users = []
    for line in lines:
        parts = line.split(':')
        if len(parts) >= 3 and parts[2] == '0':
            uid_zero_users.append(parts[0])
    
    if len(uid_zero_users) > 1:
        findings.append(Finding(
            id='C-003',
            severity='critical',
            category='Privilege Escalation',
            title=f'{len(uid_zero_users)} Usuários com UID 0 (Root)',
            evidence=f'Usuários com UID 0: {", ".join(uid_zero_users)}',
            impact='Múltiplas contas com privilégios root → violação de princípio de privilégio mínimo',
            recommendation='Remover UID 0 de contas que não sejam "root"'
        ))
    
    return findings

def parse_firewall(file_path: str) -> List[Finding]:
    """Analisa configuração de firewall"""
    findings = []
    
    if not os.path.exists(file_path):
        return findings
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Firewall desabilitado
    if 'inactive' in content.lower() or 'disabled' in content.lower():
        findings.append(Finding(
            id='H-002',
            severity='high',
            category='Network Security',
            title='Firewall Desabilitado',
            evidence='ufw status: inactive',
            impact='Todas as portas são acessíveis sem filtro',
            recommendation='ufw enable && ufw default deny incoming'
        ))
    
    return findings

def generate_report(findings: List[Finding]) -> str:
    """Gera relatório Markdown"""
    
    # Agrupa por severidade
    by_severity = {
        'critical': [],
        'high': [],
        'medium': [],
        'low': [],
        'info': []
    }
    
    for f in findings:
        by_severity[f.severity].append(f)
    
    # Contagens
    counts = {k: len(v) for k, v in by_severity.items()}
    total = sum(counts.values())
    
    # Classificação geral
    if counts['critical'] > 0:
        classification = '🚨 CRÍTICO - AÇÃO IMEDIATA NECESSÁRIA'
    elif counts['high'] > 5:
        classification = '⚠️ ATENÇÃO - MELHORIAS RECOMENDADAS'
    elif counts['high'] > 0 or counts['medium'] > 0:
        classification = '🟡 ACEITÁVEL - MONITORAMENTO NECESSÁRIO'
    else:
        classification = '✅ BOM - SEM PROBLEMAS GRAVES'
    
    # Monta relatório
    report = f"""# 🔒 VPS SECURITY SCAN REPORT

**Data:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Host:** {os.getenv('VPS_HOST', 'localhost')}  

---

## 📊 RESUMO EXECUTIVO

| Severidade | Quantidade |
|---|---|
| 🔴 Critical | {counts['critical']} |
| 🟠 High | {counts['high']} |
| 🟡 Medium | {counts['medium']} |
| 🔵 Low | {counts['low']} |
| ⚪ Info | {counts['info']} |

**CLASSIFICAÇÃO GERAL:** {classification}

---
"""
    
    # Detalhes por severidade
    severity_labels = {
        'critical': '🔴 CRITICAL FINDINGS',
        'high': '🟠 HIGH FINDINGS',
        'medium': '🟡 MEDIUM FINDINGS',
        'low': '🔵 LOW FINDINGS',
        'info': '⚪ INFO'
    }
    
    for severity in ['critical', 'high', 'medium', 'low', 'info']:
        if by_severity[severity]:
            report += f"## {severity_labels[severity]}\n\n"
            
            for finding in by_severity[severity]:
                report += f"""### [{finding.id}] {finding.title}
- **Categoria:** {finding.category}
- **Evidence:** {finding.evidence}
- **Impacto:** {finding.impact}
- **Recomendação:**
  ```bash
  {finding.recommendation}
  ```

"""
    
    # Ações recomendadas
    report += "---\n\n## ✅ AÇÕES RECOMENDADAS (Ordem de Prioridade)\n\n"
    
    priority_findings = sorted(findings, 
                             key=lambda f: {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4}[f.severity])
    
    for i, finding in enumerate(priority_findings[:10], 1):
        emoji = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🔵', 'info': '⚪'}[finding.severity]
        report += f"{i}. {emoji} **{finding.title}** ({finding.severity.upper()})\n"
    
    report += f"\n---\n\n**Total de Findings:** {total}  \n"
    report += f"**Scan Duration:** {os.getenv('SCAN_DURATION', 'N/A')}  \n"
    report += f"**Next Scan:** Agendado para amanhã 06:00 (systemd timer)  \n"
    
    return report

def main():
    if len(sys.argv) < 2:
        print("Usage: parse-results.py <output_dir>")
        sys.exit(1)
    
    output_dir = sys.argv[1]
    
    if not os.path.exists(output_dir):
        print(f"ERROR: Directory {output_dir} not found")
        sys.exit(1)
    
    # Coleta findings de todos os scans
    all_findings = []
    
    all_findings.extend(parse_ssh_config(os.path.join(output_dir, 'sshd_config.txt')))
    all_findings.extend(parse_nmap(os.path.join(output_dir, 'nmap.txt')))
    all_findings.extend(parse_trivy(os.path.join(output_dir, 'trivy.txt')))
    all_findings.extend(parse_users(os.path.join(output_dir, 'users.txt')))
    all_findings.extend(parse_firewall(os.path.join(output_dir, 'firewall.txt')))
    
    # Gera relatório
    report = generate_report(all_findings)
    print(report)

if __name__ == '__main__':
    main()
