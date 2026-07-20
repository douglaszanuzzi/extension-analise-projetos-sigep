# Robot Análise Projetos SIGEP

## Sobre o projeto

O **Robot Análise Projetos SIGEP** é uma extensão para o Google Chrome desenvolvida para auxiliar os analistas da Prefeitura de Jataí no gerenciamento da fila de análises de projetos do sistema **BSIT/SIGEP**.

A extensão automatiza a identificação dos processos pendentes de análise e realiza a distribuição equilibrada entre os analistas responsáveis.

---

## Objetivo

O principal objetivo da extensão é auxiliar na distribuição das novas análises de projetos que chegam ao sistema BSIT do SIGEP.

Sempre que novos processos forem identificados como **"Sem Análise"**, a extensão deverá distribuí-los automaticamente entre os analistas cadastrados, de forma alternada e equilibrada, mantendo a consistência da distribuição durante todo o período em que o processo permanecer pendente.

---

## Funcionalidades atuais

- Ler a tabela de processos do BSIT.
- Identificar processos com status **"Sem Análise"**.
- Extrair informações dos processos.
- Identificar o `buildingConstructionId`.
- Exibir resumo das análises pendentes.
- Exibir lista de processos na interface da extensão.

---

## Funcionalidades previstas

- Distribuição automática entre os analistas.
- Persistência da distribuição utilizando `chrome.storage.local`.
- Histórico das distribuições realizadas.
- Configuração dinâmica dos analistas participantes.
- Dashboard com estatísticas das distribuições.
- Relatórios.

---

## Tecnologias

- JavaScript (ES6)
- Chrome Extension Manifest V3
- Chrome Storage API
- DOM API

---

## Estrutura do projeto

```text
Robot Analise Projetos SIGEP
│
├── assets/
├── icons/
├── js/
│   ├── bsit/
│   ├── core/
│   ├── popup/
│   └── utils/
│
├── popup/
├── pages/
│
├── background.js
├── content.js
├── manifest.json
├── README.md
├── AGENTS.md
└── .gitignore
```

---

# Arquitetura do projeto

## Fluxo principal

Popup
↓
PopupController
↓
Content Script
↓
BSITInspector
↓
Sistema BSIT

## Responsabilidades

### BSITInspector

- Apenas extrai informações do BSIT.
- Não contém regra de negócio.

### PopupController

- Coordena o fluxo da aplicação.
- Atualiza a interface.
- Chama os módulos Core.

### Distribution

- Responsável pela distribuição dos processos.

### Storage

- Responsável pela persistência utilizando chrome.storage.local.

### Logger

- Centraliza todos os logs da aplicação.

### Responsabilidades

**BSITInspector**

- Extrai informações da página do BSIT.
- Não deve conter regras de negócio.

**PopupController**

- Coordena o funcionamento da extensão.
- Atualiza a interface.
- Processa os dados recebidos.

**Storage**

- Responsável pela persistência utilizando `chrome.storage.local`.

**Distribution**

- Responsável pelas regras de distribuição dos processos entre os analistas.

---

## Instalação

1. Clone o repositório.
2. Abra o Google Chrome.
3. Acesse `chrome://extensions`.
4. Ative o **Modo do Desenvolvedor**.
5. Clique em **Carregar sem compactação**.
6. Selecione a pasta do projeto.

---

## Licença

Projeto desenvolvido para uso interno da Prefeitura de Jataí.
