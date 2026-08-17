globalThis.HabiteseApp = globalThis.HabiteseApp || {};
var API_URL = API_URL || "https://script.google.com/macros/s/AKfycbwEQZpZNa0oNHUsNcLQBDJjo5vW5RNnH_XN5SBVaPAiY13RTf9WJ0umhdVhOc7IoZiX/exec";
var SENHA_API = SENHA_API || "habitese2026";

globalThis.HabiteseApp.ApiClient = {

    async listarDistribuicao() {
        try {
            const url = `${API_URL}?acao=listar&senha=${encodeURIComponent(SENHA_API)}`;
            const resp = await fetch(url);
            if (!resp.ok) {
                return { erro: `HTTP ${resp.status}`, distribuicao: {}, ultimoAnalista: null };
            }
            return await resp.json();
        } catch (erro) {
            console.error("[ApiClient] Falha ao listar distribuicao.", erro);
            return { erro: erro.message, distribuicao: {}, ultimoAnalista: null };
        }
    },

    async sincronizar(distribuicaoLocal, ultimoAnalista, processos, analistas) {
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    acao: "sincronizar",
                    senha: SENHA_API,
                    distribuicao: distribuicaoLocal,
                    ultimoAnalista: ultimoAnalista,
                    processos: processos.map(p => ({
                        buildingConstructionId: p.buildingConstructionId || "",
                        proprietario: p.proprietario || "",
                        area: p.area || "",
                        usoImovel: p.usoImovel || "",
                        tipo: p.tipo || ""
                    })),
                    analistas: analistas
                })
            });
            if (!resp.ok) {
                return { erro: `HTTP ${resp.status}`, distribuicao: distribuicaoLocal, ultimoAnalista };
            }
            return await resp.json();
        } catch (erro) {
            console.error("[ApiClient] Falha ao sincronizar.", erro);
            return { erro: erro.message, distribuicao: distribuicaoLocal, ultimoAnalista };
        }
    },

    async salvarHistorico(entradas) {
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    acao: "historico",
                    senha: SENHA_API,
                    entradas: entradas
                })
            });
            return await resp.json();
        } catch (erro) {
            console.error("[ApiClient] Falha ao salvar historico.", erro);
            return { erro: erro.message };
        }
    },

    async limparTudo() {
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    acao: "limpar",
                    senha: SENHA_API
                })
            });
            return await resp.json();
        } catch (erro) {
            console.error("[ApiClient] Falha ao limpar.", erro);
            return { erro: erro.message };
        }
    },
    async limparResolvidos(idsResolvidos) {
        if (!Array.isArray(idsResolvidos) || idsResolvidos.length === 0) return;
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    acao: "limparResolvidos",
                    senha: SENHA_API,
                    ids: idsResolvidos
                })
            });
            return await resp.json();
        } catch (erro) {
            console.error("[ApiClient] Erro ao limpar resolvidos:", erro);
            return { erro: erro.message };
        }
    },
};