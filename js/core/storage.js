const Storage = {

    CHAVE: "distribuicaoAnalises",

    async carregar() {

        const dados = await chrome.storage.local.get(this.CHAVE);

        const salvos = dados[this.CHAVE] || {
            ultimoAnalista: null,
            distribuicao: {}
        };

        salvos.distribuicao = salvos.distribuicao || {};

        return salvos;

    },

    async salvar(dados) {

        await chrome.storage.local.set({
            [this.CHAVE]: dados
        });

    }

};
