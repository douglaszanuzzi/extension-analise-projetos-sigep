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
        if (!ultimo) return this.ANALISTAS[0];
        const indice = this.ANALISTAS.indexOf(ultimo);
        if (indice === -1) return this.ANALISTAS[0];
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
            if (candidatosSet.has(atual)) return atual;
        }
        return candidatos[0];
    },

    escolherAnalistaPorCarga(cargaAtual, ultimoAnalista) {
        const menorCarga = Math.min(
            ...this.ANALISTAS.map(a => cargaAtual[a] || 0)
        );
        const candidatos = this.ANALISTAS.filter(
            a => (cargaAtual[a] || 0) === menorCarga
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
            const ApiClient = globalThis.HabiteseApp.ApiClient;
            const Storage = globalThis.HabiteseApp.Storage;

            // 1. Sincronizar com a planilha (servidor central)
            //    Nao enviamos o cache local — a planilha é a fonte de verdade
            let resultado = null;
            if (ApiClient && ApiClient.sincronizar) {
                try {
                    resultado = await ApiClient.sincronizar(
                        {},
                        null,
                        processos,
                        this.ANALISTAS
                    );
                    console.log("[Distribution] Resposta da API:", JSON.stringify(resultado).slice(0, 500));
                } catch (erro) {
                    console.error("[Distribution] Erro ao chamar API:", erro);
                }
            } else {
                console.error("[Distribution] ApiClient NAO disponivel!");
            }

            let distribuicao;
            let ultimoAnalista;
            let novasAtribuicoes = [];

            if (resultado && !resultado.erro && resultado.distribuicao) {
                distribuicao = resultado.distribuicao;
                ultimoAnalista = resultado.ultimoAnalista;
                console.log("[Distribution] Usando distribuicao da API. Total:", Object.keys(distribuicao).length);
            } else {
                const dadosLocal = await Storage.carregar();
                distribuicao = dadosLocal.distribuicao || {};
                ultimoAnalista = dadosLocal.ultimoAnalista || null;
                console.warn("[Distribution] API falhou, usando cache local. Total:", Object.keys(distribuicao).length);
            }

            // 2. Limpar atribuicoes de analistas removidos
            const analistasValidos = new Set(this.ANALISTAS);
            Object.keys(distribuicao).forEach(id => {
                if (!analistasValidos.has(distribuicao[id])) {
                    delete distribuicao[id];
                }
            });

            // 3. Atribuir responsavel aos processos
            for (const processo of processos) {
                const id = processo.buildingConstructionId;
                if (!id) {
                    processo.responsavel = "";
                    continue;
                }
                if (distribuicao[id]) {
                    processo.responsavel = distribuicao[id];
                    continue;
                }
                // Fallback local (so chega aqui se a API falhou)
                const cargaAtual = this.calcularCargaAtual(processos, distribuicao);
                const escolha = this.escolherAnalistaPorCarga(cargaAtual, ultimoAnalista);
                processo.responsavel = escolha.analista;
                distribuicao[id] = escolha.analista;
                ultimoAnalista = escolha.analista;

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

            // 4. Atualizar cache local
            const dadosLocal = await Storage.carregar();
            dadosLocal.distribuicao = distribuicao;
            dadosLocal.ultimoAnalista = ultimoAnalista;
            await Storage.salvar(dadosLocal);

            // 5. Salvar historico
            if (novasAtribuicoes.length > 0 && ApiClient) {
                await ApiClient.salvarHistorico(novasAtribuicoes);
            }

            execInfo.ultimoAnalistaSalvo = ultimoAnalista;
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