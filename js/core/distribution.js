let distribuicaoEmAndamento = null;

const Distribution = {

    ANALISTAS: [
        "Douglas",
        "Gabriel"
    ],

    proximoAnalista(ultimo) {

        if (!ultimo) {
            return this.ANALISTAS[0];
        }

        const indice = this.ANALISTAS.indexOf(ultimo);

        if (indice === -1) {
            return this.ANALISTAS[0];
        }

        return this.ANALISTAS[
            (indice + 1) % this.ANALISTAS.length
        ];

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

            if (
                responsavel
                && Object.prototype.hasOwnProperty.call(carga, responsavel)
            ) {
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
            ...this.ANALISTAS.map(
                analista => cargaAtual[analista] || 0
            )
        );

        const candidatos = this.ANALISTAS.filter(
            analista => (cargaAtual[analista] || 0) === menorCarga
        );

        if (candidatos.length === 1) {

            return {
                analista: candidatos[0],
                motivo: "Menor carga",
                candidatos,
                menorCarga
            };

        }

        return {
            analista: this.proximoAnalistaEntre(
                candidatos,
                ultimoAnalista
            ),
            motivo: "Empate - Round Robin",
            candidatos,
            menorCarga
        };

    },

    async distribuir(processos) {

        const execId =
            `dist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const inicio = Date.now();

        if (distribuicaoEmAndamento) {

            console.info(
                "[Distribution] Execucao concorrente detectada; aguardando a execucao atual",
                {
                    timestamp: Date.now(),
                    execId,
                    execIdEmAndamento: distribuicaoEmAndamento.id,
                    inicioExecucaoEmAndamento: distribuicaoEmAndamento.inicio,
                    quantidadeProcessos: processos.length
                }
            );

            return distribuicaoEmAndamento.promise;

        }

        const execInfo = {
            id: execId,
            inicio,
            quantidadeProcessos: processos.length,
            ultimoAnalistaCarregado: null,
            ultimoAnalistaSalvo: null
        };

        const promise = (async () => {

            const dados = await Storage.carregar();

            execInfo.ultimoAnalistaCarregado = dados.ultimoAnalista;

            const distribuicao = dados.distribuicao;

            const cargaAtual = this.calcularCargaAtual(
                processos,
                distribuicao
            );

            const processosPorAnalistaAntes = {
                ...cargaAtual
            };

            const novosProcessos = processos.filter(
                processo => (
                    processo.buildingConstructionId
                    && !distribuicao[processo.buildingConstructionId]
                )
            );

            console.info("[Distribution] Inicio da distribuicao", {
                timestamp: Date.now(),
                execId,
                horaInicio: inicio,
                quantidadeProcessos: processos.length,
                analistas: this.ANALISTAS,
                ultimoAnalistaCarregado: execInfo.ultimoAnalistaCarregado,
                quantidadeDistribuicaoAntes: Object.keys(distribuicao).length,
                cargaAtual: processosPorAnalistaAntes,
                quantidadeNovosProcessos: novosProcessos.length,
                processos: processos.map(processo => ({
                    id: processo.buildingConstructionId,
                    status: processo.status,
                    analistaAtual: processo.analista
                }))
            });

            console.info("=== FILA RECEBIDA ===", processos.map(processo => {

                const id = processo.buildingConstructionId;

                return {
                    id,
                    responsavelAtual: id ? distribuicao[id] || "" : "",
                    ehNovo: Boolean(id && !distribuicao[id]),
                    estaNoStorage: Boolean(id && distribuicao[id]),
                    status: processo.status,
                    analistaBsit: processo.analista
                };

            }));

            console.info("=== CARGA CALCULADA ===", {
                ...cargaAtual
            });

            for (const [indice, processo] of processos.entries()) {

                const id = processo.buildingConstructionId;

                console.info("=== PROCESSO ANALISADO ===", {
                    id,
                    indiceFila: indice,
                    novoOuExistente: id && distribuicao[id]
                        ? "existente"
                        : "novo",
                    estaNoStorage: Boolean(id && distribuicao[id]),
                    responsavelAtual: id ? distribuicao[id] || "" : "",
                    cargaAntes: {
                        ...cargaAtual
                    }
                });

                if (!id) {

                    processo.responsavel = "";

                    console.info("[Distribution] Processo sem id", {
                        indiceFila: indice,
                        motivo: "Sem buildingConstructionId",
                        analistaEscolhido: "",
                        analistaAnterior: dados.ultimoAnalista,
                        cargaAtual: {
                            ...cargaAtual
                        }
                    });

                    console.info("=== CARGA APOS ATRIBUICAO ===", {
                        id,
                        analistaEscolhido: "",
                        motivo: "Sem buildingConstructionId",
                        carga: {
                            ...cargaAtual
                        }
                    });

                    continue;

                }

                if (distribuicao[id]) {

                    processo.responsavel =
                        distribuicao[id];

                    console.info("[Distribution] Processo ja distribuido", {
                        numeroAnalise: id,
                        indiceFila: indice,
                        motivo: "Ja existente em distribuicao",
                        analistaEscolhido: processo.responsavel,
                        analistaAnterior: dados.ultimoAnalista,
                        cargaAtual: {
                            ...cargaAtual
                        }
                    });

                    console.info("=== CARGA APOS ATRIBUICAO ===", {
                        id,
                        analistaEscolhido: processo.responsavel,
                        motivo: "Existente - carga nao alterada",
                        carga: {
                            ...cargaAtual
                        }
                    });

                    continue;

                }

                const cargaAntesDaEscolha = {
                    ...cargaAtual
                };

                const escolha = this.escolherAnalistaPorCarga(
                    cargaAtual,
                    dados.ultimoAnalista
                );

                const responsavel = escolha.analista;
                const analistaAnterior = dados.ultimoAnalista;

                processo.responsavel = responsavel;

                distribuicao[id] = responsavel;

                dados.ultimoAnalista = responsavel;

                cargaAtual[responsavel] =
                    (cargaAtual[responsavel] || 0) + 1;

                console.info("[Distribution] Novo responsavel atribuido", {
                    numeroAnalise: id,
                    indiceFila: indice,
                    motivo: escolha.motivo,
                    analistaEscolhido: responsavel,
                    analistaAnterior,
                    cargaAtual: cargaAntesDaEscolha,
                    cargaDepois: {
                        ...cargaAtual
                    },
                    candidatosEmpate: escolha.candidatos,
                    menorCarga: escolha.menorCarga
                });

                console.info("=== CARGA APOS ATRIBUICAO ===", {
                    id,
                    analistaEscolhido: responsavel,
                    motivo: escolha.motivo,
                    carga: {
                        ...cargaAtual
                    }
                });

            }

            const idsAtuais = new Set(
                processos
                    .map(processo => processo.buildingConstructionId)
                    .filter(Boolean)
            );

            console.info("[DEBUG DISTRIBUICAO] Hipotese 2 - antes da limpeza do Storage", {
                quantidadeIdsStorageAntesLimpeza: Object.keys(distribuicao).length,
                quantidadeIdsFilaAtual: idsAtuais.size,
                idsStorageAntesLimpeza: Object.keys(distribuicao),
                idsFilaAtual: Array.from(idsAtuais)
            });

            Object.keys(distribuicao).forEach(id => {

                if (!idsAtuais.has(id)) {

                    console.info("[DEBUG DISTRIBUICAO] Hipotese 2 - removendo id do Storage", {
                        id,
                        responsavelPersistido: distribuicao[id],
                        motivo: "id persistido nao encontrado na fila atual recebida pelo Distribution",
                        quantidadeIdsStorageAntesDelete: Object.keys(distribuicao).length,
                        quantidadeIdsFilaAtual: idsAtuais.size
                    });

                    delete distribuicao[id];
                }

            });

            console.info("[DEBUG DISTRIBUICAO] Hipotese 2 - depois da limpeza do Storage", {
                quantidadeIdsStorageDepoisLimpeza: Object.keys(distribuicao).length,
                idsStorageDepoisLimpeza: Object.keys(distribuicao)
            });

            await Storage.salvar(dados);

            execInfo.ultimoAnalistaSalvo = dados.ultimoAnalista;

            const processosPorAnalistaDepois =
                this.calcularCargaAtual(processos, distribuicao);

            console.info("[Distribution] Fim da distribuicao", {
                timestamp: Date.now(),
                execId,
                horaInicio: inicio,
                duracaoMs: Date.now() - inicio,
                ultimoAnalistaCarregado: execInfo.ultimoAnalistaCarregado,
                ultimoAnalistaSalvo: execInfo.ultimoAnalistaSalvo,
                quantidadeDistribuicaoDepois: Object.keys(distribuicao).length,
                quantidadeProcessosPorAnalistaAntes: processosPorAnalistaAntes,
                quantidadeProcessosPorAnalistaDepois: processosPorAnalistaDepois,
                resultado: processos.map(processo => ({
                    id: processo.buildingConstructionId,
                    responsavel: processo.responsavel
                }))
            });

            return processos;

        })();

        distribuicaoEmAndamento = {
            id: execId,
            inicio,
            promise
        };

        try {
            return await promise;
        } finally {
            if (distribuicaoEmAndamento?.id === execId) {
                distribuicaoEmAndamento = null;
            }
        }

    }

};
