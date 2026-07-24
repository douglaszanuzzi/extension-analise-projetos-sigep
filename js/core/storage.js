const Storage = {

    CHAVE: "distribuicaoAnalises",

    async carregar() {

        const dados = await chrome.storage.local.get(this.CHAVE);

        console.info("[Storage] carregar", {
            chave: this.CHAVE,
            dadosSalvos: dados[this.CHAVE] || null
        });

        const salvos = dados[this.CHAVE] || {
            ultimoAnalista: null,
            distribuicao: {}
        };

        salvos.distribuicao = salvos.distribuicao || {};

        return salvos;

    },

    async salvar(dados) {

        console.info("[Storage] salvar", {
            chave: this.CHAVE,
            dadosParaSalvar: dados
        });

        await chrome.storage.local.set({
            [this.CHAVE]: dados
        });

    }

};
