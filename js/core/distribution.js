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

    async distribuir(processos) {

        const dados = await Storage.carregar();

        const distribuicao = dados.distribuicao;

        console.info("[Distribution] Início da distribuição", {
            quantidadeProcessos: processos.length,
            analistas: this.ANALISTAS,
            ultimoAnalistaAntes: dados.ultimoAnalista,
            quantidadeDistribuicaoAntes: Object.keys(distribuicao).length,
            processos: processos.map(p => ({
                id: p.buildingConstructionId,
                status: p.status,
                analistaAtual: p.analista
            }))
        });

        for (const [indice, processo] of processos.entries()) {

            const id = processo.buildingConstructionId;

            if (!id) {

                processo.responsavel = "";

                console.info("[Distribution] Processo sem id", {
                    indiceFila: indice,
                    motivo: "sem buildingConstructionId",
                    analistaEscolhido: "",
                    analistaAnterior: dados.ultimoAnalista,
                    estadoInterno: {
                        ultimoAnalista: dados.ultimoAnalista,
                        quantidadeAnalistas: this.ANALISTAS.length,
                        quantidadeDistribuicao: Object.keys(distribuicao).length
                    }
                });

                continue;

            }

            if (distribuicao[id]) {

                processo.responsavel =
                    distribuicao[id];

                console.info("[Distribution] Processo já distribuído", {
                    numeroAnalise: id,
                    indiceFila: indice,
                    motivo: "já existente em distribuicao",
                    analistaEscolhido: processo.responsavel,
                    analistaAnterior: dados.ultimoAnalista,
                    estadoInterno: {
                        ultimoAnalista: dados.ultimoAnalista,
                        quantidadeAnalistas: this.ANALISTAS.length,
                        quantidadeDistribuicao: Object.keys(distribuicao).length
                    }
                });

                continue;

            }

            const responsavel =
                this.proximoAnalista(
                    dados.ultimoAnalista
                );

            processo.responsavel = responsavel;

            distribuicao[id] = responsavel;

            dados.ultimoAnalista = responsavel;

            console.info("[Distribution] Novo responsável atribuído", {
                numeroAnalise: id,
                indiceFila: indice,
                motivo: "novo processo sem distribuição",
                analistaEscolhido: responsavel,
                analistaAnterior: dados.ultimoAnalista,
                estadoInterno: {
                    ultimoAnalista: dados.ultimoAnalista,
                    quantidadeAnalistas: this.ANALISTAS.length,
                    quantidadeDistribuicao: Object.keys(distribuicao).length
                }
            });

        }

        // Remove processos que já saíram da fila

        const idsAtuais = new Set(
            processos
                .map(p => p.buildingConstructionId)
                .filter(Boolean)
        );

        Object.keys(distribuicao).forEach(id => {

            if (!idsAtuais.has(id)) {
                delete distribuicao[id];
            }

        });

        await Storage.salvar(dados);

        console.info("[Distribution] Fim da distribuição", {
            ultimoAnalistaDepois: dados.ultimoAnalista,
            quantidadeDistribuicaoDepois: Object.keys(distribuicao).length,
            resultado: processos.map(p => ({
                id: p.buildingConstructionId,
                responsavel: p.responsavel
            }))
        });

        return processos;

    }

};
