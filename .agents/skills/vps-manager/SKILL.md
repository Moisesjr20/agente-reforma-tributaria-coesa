---
name: vps-manager
description: Manage VPS operations including system administration, Docker containers, services, monitoring, and infrastructure tasks.
metadata:
  version: 1.0.0
  author: GueClaw System
  category: infrastructure
  tools:
    - vps_execute_command
    - docker_manage
    - file_operations
    - api_request
---

# VPS Manager Skill

## Purpose

This skill provides comprehensive VPS management capabilities. It enables GueClaw to perform system administration tasks, manage Docker containers, monitor services, handle files, and maintain the infrastructure.

## Core Capabilities

### 1. System Administration

- Execute shell commands
- Manage system services (systemctl)
- Monitor system resources (CPU, RAM, disk)
- Check system logs
- User and permission management
- Package installation and updates
- Network configuration

### 2. Docker Management

- List, start, stop, restart containers
- View container logs
- Inspect container details
- Manage images (pull, build, remove)
- Docker Compose operations
- Network and volume management
- Resource monitoring

### 3. Service Management

- Check service status
- Restart services
- View service logs
- Configure services
- Enable/disable auto-start

### 4. File Operations

- Read, write, modify files
- Create, delete directories
- File permissions and ownership
- Search and find files
- Archive and compress

### 🗂️ File Repository (IMPORTANTE)

**Localização do repositório de arquivos:** `/opt/gueclaw-data/files/`

Qualquer arquivo criado que o usuário precise acessar depois DEVE ser salvo usando a tool `save_to_repository`.

**Tipos de arquivo para salvar no repositório:**
- HTML (carrosséis, landing pages, páginas web)
- JSON (exports, dados estruturados)
- CSV (relatórios, planilhas)
- TXT/MD (documentos, notas)
- Qualquer arquivo que o usuário precise visualizar/baixar depois

**NÃO salvar no repositório:**
- Configurações internas (.env, configs do sistema)
- Logs temporários
- Arquivos de cache

### 5. Monitoring & Diagnostics

- CPU, memory, disk usage
- Process monitoring
- Log analysis
- Network statistics
- Performance metrics

## Instructions

### System Information

To get system information:

```
Action: vps_execute_command
Parameters:
  command: uname -a && cat /etc/os-release && df -h && free -h
```

### Check Running Processes

```
Action: vps_execute_command
Parameters:
  command: ps aux --sort=-%mem | head -n 10
```

### Docker Container Management

**List all containers:**
```
Action: docker_manage
Parameters:
  action: list_containers
```

**View container logs:**
```
Action: docker_manage
Parameters:
  action: logs
  containerName: [container_name]
  tail: 100
```

**Restart a container:**
```
Action: docker_manage
Parameters:
  action: restart
  containerName: [container_name]
```

### Service Management

**Check service status:**
```
Action: vps_execute_command
Parameters:
  command: systemctl status [service_name]
```

**Restart a service:**
```
Action: vps_execute_command
Parameters:
  command: sudo systemctl restart [service_name]
```

**View service logs:**
```
Action: vps_execute_command
Parameters:
  command: journalctl -u [service_name] -n 50 --no-pager
```

### File Repository Operations

**SEMPRE que criar um arquivo que o usuário precisa acessar, use save_to_repository:**

```
Action: save_to_repository
Parameters:
  filename: nome-do-arquivo.html
  content: <conteúdo completo do arquivo>
  description: Descrição clara do que contém
```

**Verificar se arquivo foi salvo:**
```
Action: vps_execute_command
Parameters:
  command: ls -lah /opt/gueclaw-data/files/nome-do-arquivo.html
```

**Listar todos arquivos do repositório:**
```
Action: vps_execute_command
Parameters:
  command: ls -lah /opt/gueclaw-data/files/
```

### File Operations (Internas)

**Read configuration file:**
```
Action: file_operations
Parameters:
  action: read
  filePath: /path/to/config.conf
```

**Update configuration:**
```
Action: file_operations
Parameters:
  action: write
  filePath: /path/to/config.conf
  content: [new_configuration]
```

**Create backup:**
```
Action: vps_execute_command
Parameters:
  command: tar -czf /backups/backup-$(date +%Y%m%d).tar.gz /path/to/data
```

### Monitoring

**Check disk usage:**
```
Action: vps_execute_command
Parameters:
  command: df -h
```

**Check memory usage:**
```
Action: vps_execute_command
Parameters:
  command: free -h && ps aux --sort=-%mem | head -n 5
```

**Check network connections:**
```
Action: vps_execute_command
Parameters:
  command: netstat -tuln | grep LISTEN
```

**Monitor system load:**
```
Action: vps_execute_command
Parameters:
  command: uptime && top -bn1 | head -n 20
```

## Common Tasks

### Deploy Application with Docker

1. Pull latest image:
   ```
   docker_manage: pull -> imageName: [image]
   ```

2. Stop old container:
   ```
   docker_manage: stop -> containerName: [container]
   ```

3. Remove old container:
   ```
   docker_manage: remove -> containerName: [container]
   ```

4. Start new container:
   ```
   vps_execute_command: docker run -d --name [container] -p 8080:80 [image]
   ```

5. Verify:
   ```
   docker_manage: logs -> containerName: [container], tail: 50
   ```

### Update System Packages

```
Action: vps_execute_command
Parameters:
  command: sudo apt update && sudo apt upgrade -y && sudo apt autoremove -y
```

### Clean Docker Resources

```
Action: vps_execute_command
Parameters:
  command: docker system prune -af --volumes
```

### Backup Important Files

```
Action: vps_execute_command
Parameters:
  command: |
    mkdir -p /backups
    tar -czf /backups/config-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
      /etc/nginx \
      /etc/letsencrypt \
      /var/www
```

### Check Security Updates

```
Action: vps_execute_command
Parameters:
  command: apt list --upgradable | grep -i security
```

## Troubleshooting

### High Memory Usage

1. Check top processes: `ps aux --sort=-%mem | head -n 10`
2. Check Docker containers: `docker stats --no-stream`
3. Clear caches if needed: `sync && echo 3 > /proc/sys/vm/drop_caches`

### Service Not Responding

1. Check service status: `systemctl status [service]`
2. Check logs: `journalctl -u [service] -n 100`
3. Try restart: `systemctl restart [service]`
4. Check port availability: `netstat -tuln | grep [port]`

### Disk Full

1. Check usage: `df -h`
2. Find large files: `du -sh /* | sort -h`
3. Clean Docker: `docker system prune -af`
4. Clean logs: `journalctl --vacuum-time=7d`

### Container Issues

1. Check container logs: `docker logs [container]`
2. Inspect container: `docker inspect [container]`
3. Check resource limits: `docker stats [container]`
4. Restart if needed: `docker restart [container]`

## Security Best Practices

- Always use `sudo` for privileged operations
- Review commands before executing destructive operations
- Keep backups before major changes
- Monitor logs for suspicious activity
- Keep system and packages updated
- Use Docker security best practices
- Limit exposed ports

## Error Handling

- **Permission Denied**: Ensure using sudo for privileged operations
- **Command Not Found**: Check if required software is installed
- **Docker Daemon Not Running**: Start Docker service
- **Out of Disk Space**: Clean up logs and unused containers/images
- **Service Failed to Start**: Check logs for specific error messages

## Notes

- Always backup before making significant changes
- Test commands in non-production first when possible
- Monitor system resources after changes
- Keep documentation of configurations
- Use version control for important files
- Schedule regular maintenance tasks
