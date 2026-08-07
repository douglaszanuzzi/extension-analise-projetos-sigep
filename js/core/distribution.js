globalThis.HabiteseApp = globalThis.HabiteseApp || {};

let distribuicaoEmAndamento = null;

function distributionDebugAtivo() {
    return globalThis.HABITESE_DEBUG !== false;
}

function distributionInfo(...args) {
    if (distributionDebugAtivo()) {
        console.info(...args);
    }
}

function distributionWarn(...args) {
    if (distributionDebugAtivo()) {
        console.warn(...args);
    }
}

globalThis.HabiteseApp.Distribution = {

    ANALISTAS: ["Douglas", "Gabriel"],

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
            distributionWarn("[Distribution] Lista de processos invalida.", processos);
            processos = [];
        }

        const execId = `dist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const inicio = Date.now();

        if (distribuicaoEmAndamento) {
            distributionInfo("[Distribution] Execucao concorrente detectada; aguardando", {
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
            const cargaAtual = this.calcularCargaAtual(processos, distribuicao);
            const processosPorAnalistaAntes = { ...cargaAtual };

            const novosProcessos = processos.filter(
                processo => processo.buildingConstructionId && !distribuicao[processo.buildingConstructionId]
            );

            distributionInfo("[Distribution] Inicio da distribuicao", {
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