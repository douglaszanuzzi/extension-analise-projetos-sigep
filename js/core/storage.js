const Storage = {

    CHAVE: "distribuicaoAnalises",

    async carregar() {

        const dados = await chrome.storage.local.get(this.CHAVE);

        return dados[this.CHAVE] || {
            ultimoAnalista: null,
            distribuicao: {}
        };

    },

    async salvar(dados) {

        await chrome.storage.local.set({
            [this.CHAVE]: dados
        });

    }

};