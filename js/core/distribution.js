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

        for (const processo of processos) {

            const id = processo.buildingConstructionId;

            if (distribuicao[id]) {

                processo.responsavel =
                    distribuicao[id];

                continue;

            }

            const responsavel =
                this.proximoAnalista(
                    dados.ultimoAnalista
                );

            processo.responsavel = responsavel;

            distribuicao[id] = responsavel;

            dados.ultimoAnalista = responsavel;

        }

        // Remove processos que já saíram da fila

        const idsAtuais = new Set(
            processos.map(p => p.buildingConstructionId)
        );

        Object.keys(distribuicao).forEach(id => {

            if (!idsAtuais.has(id)) {
                delete distribuicao[id];
            }

        });

        await Storage.salvar(dados);

        return processos;

    }

};