# Instruções do projeto

Este projeto é uma extensão Chrome Manifest V3.

Objetivo:

Distribuir automaticamente apenas os novos processos que entrarem na fila de análise, mantendo a distribuição já realizada para os processos pendentes e alternando os responsáveis de forma equilibrada.

Regras:

- Não utilizar React.
- Não utilizar TypeScript.
- Não utilizar jQuery.
- Utilizar JavaScript puro.
- Não adicionar dependências sem necessidade.
- Manter compatibilidade com Manifest V3.
- Sempre reutilizar código existente.
- Nunca alterar arquitetura sem necessidade.

Arquitetura:

Popup

↓

PopupController

↓

Content Script

↓

BSITInspector

↓

DOM do BSIT

Core:

Storage
Distribution
Logger

O Inspector apenas lê dados da página.

PopupController coordena as ações.

Storage persiste dados.

Distribution contém regras de distribuição.
