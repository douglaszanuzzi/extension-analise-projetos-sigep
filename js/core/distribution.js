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

// Gera chave única do processo — usa buildingConstructionId se existir,
// senão cria chave composta com proprietario + area + usoImovel
function obterChaveProcesso(processo) {
    const id = processo.buildingConstructionId;
    if (id && String(id).trim()) return String(id).trim();
    const fallback = [
        (processo.proprietario || "").trim().toLowerCase(),
        (processo.area || "").trim().toLowerCase(),
        (processo.usoImovel || "").trim().toLowerCase()
    ].join("|");
    return fallback || null;
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
            const id = obterChaveProcesso(processo);
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

        const promise = (async () => {
            const ApiClient = globalThis.HabiteseApp.ApiClient;
            const Storage = globalThis.HabiteseApp.Storage;

            // 1. Carregar cache LOCAL primeiro (instantâneo)
            const dadosLocal = await Storage.carregar();
            let distribuicao = dadosLocal.distribuicao || {};
            let ultimoAnalista = dadosLocal.ultimoAnalista || null;

            // 2. Atribuir do cache (instantâneo) e separar NOVOS
            const idsAtuais = new Set();
            const processosNovos = [];

            processos.forEach(processo => {
                const id = obterChaveProcesso(processo);
                if (!id) {
                    processo.responsavel = "";
                    return;
                }
                processo._chaveDistribuicao = id;
                idsAtuais.add(id);
                if (distribuicao[id]) {
                    processo.responsavel = distribuicao[id];
                } else {
                    processo.responsavel = "";
                    processosNovos.push(processo);
                }
            });

            await distributionInfo("[Distribution] Resumo local", {
                totalProcessos: processos.length,
                jaDistribuidos: processos.length - processosNovos.length,
                novos: processosNovos.length
            });

            // 3. Sincronizar SÓ processos novos com a API (se houver)
            let novasAtribuicoes = [];

            if (processosNovos.length > 0) {
                let resultado = null;
                if (ApiClient && ApiClient.sincronizar) {
                    try {
                        resultado = await ApiClient.sincronizar(
                            distribuicao,
                            ultimoAnalista,
                            processosNovos,
                            this.ANALISTAS
                        );
                        await distributionInfo("[Distribution] Resposta da API recebida", {
                            novosEnviados: processosNovos.length
                        });
                    } catch (erro) {
                        await distributionWarn("[Distribution] Erro ao chamar API:", erro);
                    }
                }

                if (resultado && !resultado.erro && resultado.distribuicao) {
                    distribuicao = { ...distribuicao, ...resultado.distribuicao };
                    ultimoAnalista = resultado.ultimoAnalista || ultimoAnalista;
                }

                // 4. Atribuir responsável aos processos novos
                for (const processo of processosNovos) {
                    const id = processo._chaveDistribuicao || obterChaveProcesso(processo);
                    if (!id) continue;

                    if (distribuicao[id]) {
                        processo.responsavel = distribuicao[id];
                        continue;
                    }

                    // Round-robin puro — alterna entre analistas
                    const proximo = this.proximoAnalista(ultimoAnalista);
                    processo.responsavel = proximo;
                    distribuicao[id] = proximo;
                    ultimoAnalista = proximo;

                    novasAtribuicoes.push({
                        data: new Date().toISOString(),
                        analista: proximo,
                        buildingConstructionId: id,
                        proprietario: processo.proprietario || "",
                        area: processo.area || "",
                        usoImovel: processo.usoImovel || "",
                        tipo: processo.tipo || ""
                    });
                }
            }

            // 5. Limpeza: remover processos resolvidos (não estão mais na lista atual)
            const idsResolvidos = Object.keys(distribuicao).filter(id => !idsAtuais.has(id));
            if (idsResolvidos.length > 0) {
                await distributionInfo("[Distribution] Limpando processos resolvidos", {
                    quantidade: idsResolvidos.length,
                    ids: idsResolvidos.slice(0, 10)
                });
                idsResolvidos.forEach(id => delete distribuicao[id]);

                // Limpar na planilha apenas IDs reais (não chaves compostas com "|")
                const idsLimpar = idsResolvidos.filter(id => !id.includes("|"));
                if (ApiClient && ApiClient.limparResolvidos && idsLimpar.length > 0) {
                    ApiClient.limparResolvidos(idsLimpar).catch(erro => {
                        distributionWarn("[Distribution] Falha ao limpar resolvidos na API.", erro);
                    });
                }
            }

            // 6. Atualizar cache local
            dadosLocal.distribuicao = distribuicao;
            dadosLocal.ultimoAnalista = ultimoAnalista;
            await Storage.salvar(dadosLocal);

            // 7. Salvar histórico (apenas novas atribuições)
            if (novasAtribuicoes.length > 0 && ApiClient && ApiClient.salvarHistorico) {
                await ApiClient.salvarHistorico(novasAtribuicoes);
            }

            const tempoTotal = Date.now() - inicio;
            await distributionInfo("[Distribution] Concluido", {
                tempoMs: tempoTotal,
                novasAtribuicoes: novasAtribuicoes.length,
                resolvidosRemovidos: idsResolvidos.length,
                totalDistribuicao: Object.keys(distribuicao).length
            });

            return processos;
        })();

        distribuicaoEmAndamento = { id: execId, inicio, promise };
        try {
            return await promise;
        } finally {
            if (distribuicaoEmAndamento && distribuicaoEmAndamento.id === execId) {
                distribuicaoEmAndamento = null;
            }
        }
    }
};