globalThis.HabiteseApp = globalThis.HabiteseApp || {};

function storageDebugAtivo() {
    return globalThis.HABITESE_DEBUG !== false;
}
async function isDebugAtivo() {
    try {
        const dados = await chrome.storage.local.get("debugAtivo");
        return dados.debugAtivo === true;
    } catch {
        return false;
    }
}
function storageInfo(...args) {
    if (storageDebugAtivo()) {
        console.info(...args);
    }
}

function storageWarn(...args) {
    if (storageDebugAtivo()) {
        console.warn(...args);
    }
}

globalThis.HabiteseApp.Storage = {

    CHAVE: "distribuicaoAnalises",

    dadosPadrao() {
        return {
            ultimoAnalista: null,
            distribuicao: {}
        };
    },

    async carregar() {
        try {
            const dados = await chrome.storage.local.get(this.CHAVE);
            storageInfo("[Storage] carregar", {
                chave: this.CHAVE,
                dadosSalvos: dados[this.CHAVE] || null
            });
            const salvos = dados[this.CHAVE] || this.dadosPadrao();
            if (!salvos || typeof salvos !== "object") {
                return this.dadosPadrao();
            }
            salvos.distribuicao =
                salvos.distribuicao && typeof salvos.distribuicao === "object"
                    ? salvos.distribuicao
                    : {};
            return salvos;
        } catch (erro) {
            storageWarn("[Storage] Falha ao carregar distribuicao. Usando dados padrao.", erro);
            return this.dadosPadrao();
        }
    },

    async salvar(dados) {
        try {
            storageInfo("[Storage] salvar", {
                chave: this.CHAVE,
                dadosParaSalvar: dados
            });
            await chrome.storage.local.set({ [this.CHAVE]: dados });
            return true;
        } catch (erro) {
            storageWarn("[Storage] Falha ao salvar distribuicao.", erro);
            return false;
        }
    }
};