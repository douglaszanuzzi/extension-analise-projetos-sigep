globalThis.HabiteseApp = globalThis.HabiteseApp || {};
let distribuicaoEmAndamento = null;

async function isDebugAtivo() {
    try {
        const dados = await chrome.storage.local.get("debugAtivo");
        return dados.debugAtivo === true;
    } catch {
        return false;
    }
}

async function distributionInfo(...args) {
    const ativo = await isDebugAtivo();
    if (ativo) {
        console.info("[Distribution]", ...args);
    }
}

async function distributionWarn(...args) {
    const ativo = await isDebugAtivo();
    if (ativo) {
        console.warn("[Distribution]", ...args);
    }
}

globalThis.HabiteseApp.Distribution = {
    ANALISTAS_PADRAO: ["Douglas", "Gabriel"],
    ANALISTAS: ["Douglas", "Gabriel"],

    async carregarAnalistas() {
        try {
            const dados = await chrome.storage.local.get("analistas");
            const salvos = dados.analistas;
            if (Array.isArray(salvos) && salvos.length > 0) {
                this.ANALISTAS = salvos;
            } else {
                this.ANALISTAS = [...this.ANALISTAS_PADRAO];
            }
        } catch (erro) {
            await distributionWarn("[Distribution] Falha ao carregar analistas. Usando padrao.", erro);
            this.ANALISTAS = [...this.ANALISTAS_PADRAO];
        }
        return this.ANALISTAS;
    },

    proximoAnalista(ultimo) {
        if (!ultimo) {
            return this.ANALISTAS[0];
        }
        const indice = this.ANALISTAS.indexOf(ultimo);
        if (indice === -1) {
            return this.ANALISTAS[0];
        }
        return this.ANALISTAS[(indice + 1) % this.ANALISTAS.length];
    },

    criarCargaInicial() {
        return this.ANALISTAS.reduce((carga, analista) => {
            carga[analista] = 0;
            return carga;
        }, {});
    },

    calcularCargaAtual(processos, distribuicao) {
        const carga = this.criarCargaInicial();
        processos.forEach(processo => {
            const id = processo.buildingConstructionId;
            const responsavel = id ? distribuicao[id] : "";
            if (responsavel && Object.prototype.hasOwnProperty.call(carga, responsavel)) {
                carga[responsavel]++;
            }
        });
        return carga;
    },

    proximoAnalistaEntre(candidatos, ultimo) {
        const candidatosSet = new Set(candidatos);
        let atual = ultimo;
        for (let i = 0; i < this.ANALISTAS.length; i++) {
            atual = this.proximoAnalista(atual);
            if (candidatosSet.has(atual)) {
                return atual;
            }
        }
        return candidatos[0];
    },

    escolherAnalistaPorCarga(cargaAtual, ultimoAnalista) {
        const menorCarga = Math.min(
            ...this.ANALISTAS.map(analista => cargaAtual[analista] || 0)
        );
        const candidatos = this.ANALISTAS.filter(
            analista => (cargaAtual[analista] || 0) === menorCarga
        );
        if (candidatos.length === 1) {
            return { analista: candidatos[0], motivo: "Menor carga", candidatos, menorCarga };
        }
        return {
            analista: this.proximoAnalistaEntre(candidatos, ultimoAnalista),
            motivo: "Empate - Round Robin",
            candidatos,
            menorCarga
        };
    },

    async distribuir(processos) {
        if (!Array.isArray(processos)) {
            await distributionWarn("[Distribution] Lista de processos invalida.", processos);
            processos = [];
        }
        await this.carregarAnalistas();

        const execId = `dist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const inicio = Date.now();

        if (distribuicaoEmAndamento) {
            await distributionInfo("[Distribution] Execucao concorrente detectada; aguardando", {
                timestamp: Date.now(), execId,
                execIdEmAndamento: distribuicaoEmAndamento.id,
                inicioExecucaoEmAndamento: distribuicaoEmAndamento.inicio,
                quantidadeProcessos: processos.length
            });
            return distribuicaoEmAndamento.promise;
        }

        const execInfo = { id: execId, inicio, quantidadeProcessos: processos.length, ultimoAnalistaCarregado: null, ultimoAnalistaSalvo: null };

        const promise = (async () => {
            const Storage = globalThis.HabiteseApp.Storage;
            const dados = await Storage.carregar();
            execInfo.ultimoAnalistaCarregado = dados.ultimoAnalista;
            const distribuicao = dados.distribuicao;

            // Limpar atribuicoes de analistas que foram removidos da lista
            const analistasValidos = new Set(this.ANALISTAS);
            Object.keys(distribuicao).forEach(id => {
                if (!analistasValidos.has(distribuicao[id])) {
                    delete distribuicao[id];
                }
            });

            const cargaAtual = this.calcularCargaAtual(processos, distribuicao);
            const novasAtribuicoes = [];
            const processosPorAnalistaAntes = { ...cargaAtual };
            const novosProcessos = processos.filter(
                processo => processo.buildingConstructionId && !distribuicao[processo.buildingConstructionId]
            );

            await distributionInfo("[Distribution] Inicio da distribuicao", {
                timestamp: Date.now(), execId, horaInicio: inicio,
                quantidadeProcessos: processos.length, analistas: this.ANALISTAS,
                ultimoAnalistaCarregado: execInfo.ultimoAnalistaCarregado,
                quantidadeDistribuicaoAntes: Object.keys(distribuicao).length,
                cargaAtual: processosPorAnalistaAntes,
                quantidadeNovosProcessos: novosProcessos.length,
                processos: processos.map(p => ({ id: p.buildingConstructionId, status: p.status, analistaAtual: p.analista }))
            });

            for (const [indice, processo] of processos.entries()) {
                const id = processo.buildingConstructionId;
                if (!id) {
                    processo.responsavel = "";
                    continue;
                }
                if (distribuicao[id]) {
                    processo.responsavel = distribuicao[id];
                    continue;
                }
                const escolha = this.escolherAnalistaPorCarga(cargaAtual, dados.ultimoAnalista);
                processo.responsavel = escolha.analista;
                distribuicao[id] = escolha.analista;
                dados.ultimoAnalista = escolha.analista;
                cargaAtual[escolha.analista] = (cargaAtual[escolha.analista] || 0) + 1;

                novasAtribuicoes.push({
                    data: new Date().toISOString(),
                    analista: escolha.analista,
                    buildingConstructionId: processo.buildingConstructionId || "",
                    proprietario: processo.proprietario || "",
                    area: processo.area || "",
                    usoImovel: processo.usoImovel || "",
                    tipo: processo.tipo || ""
                });
            }

            if (novasAtribuicoes.length > 0) {
                await Storage.salvarHistorico(novasAtribuicoes);
            }

            const idsAtuais = new Set(
                processos.map(p => p.buildingConstructionId).filter(Boolean)
            );
            Object.keys(distribuicao).forEach(id => {
                if (!idsAtuais.has(id)) {
                    delete distribuicao[id];
                }
            });

            await Storage.salvar(dados);
            execInfo.ultimoAnalistaSalvo = dados.ultimoAnalista;
            return processos;
        })();

        distribuicaoEmAndamento = { id: execId, inicio, promise };
        try {
            return await promise;
        } finally {
            if (distribuicaoEmAndamento?.id === execId) {
                distribuicaoEmAndamento = null;
            }
        }
    }
};