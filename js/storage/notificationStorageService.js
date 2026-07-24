const STORAGE_KEY = "notificationInbox";

function criarInboxPadrao() {

    return {
        grupos: [],
        ultimaSincronizacao: "",
        totalNovos: 0
    };

}

function extrairArquivos(notificacoes = []) {

    return notificacoes
        .map(item => item.arquivo || item.titulo || "")
        .filter(Boolean)
        .filter((valor, indice, lista) => lista.indexOf(valor) === indice);

}

function normalizarGrupo(grupo = {}) {

    const notificacoes = Array.isArray(grupo.notificacoes)
        ? grupo.notificacoes
        : [];

    const visto = grupo.visto ?? !grupo.ehNovo;

    return {
        id: grupo.id || "",
        status: grupo.status || "NEW",
        dataInicio: grupo.dataInicio || "",
        dataFim: grupo.dataFim || "",
        primeiraNotificacaoEm:
            grupo.primeiraNotificacaoEm || grupo.dataInicio || "",
        ultimaAtualizacaoEm:
            grupo.ultimaAtualizacaoEm || grupo.dataFim || "",
        notificacoes,
        proprietario: grupo.proprietario || "",
        cci: grupo.cci || "",
        arquivos: Array.isArray(grupo.arquivos)
            ? grupo.arquivos
            : extrairArquivos(notificacoes),
        visto: Boolean(visto),
        vistoEm: grupo.vistoEm || "",
        ehNovo: !Boolean(visto)
    };

}

export const StorageService = {

    async carregarInbox() {

        const dados = await chrome.storage.local.get(STORAGE_KEY);
        const inbox = dados[STORAGE_KEY] || criarInboxPadrao();

        return {
            ...criarInboxPadrao(),
            ...inbox,
            grupos: Array.isArray(inbox.grupos)
                ? inbox.grupos.map(normalizarGrupo)
                : []
        };

    },

    async salvarInbox(inbox) {

        const dados = {
            ...criarInboxPadrao(),
            ...inbox,
            grupos: Array.isArray(inbox.grupos)
                ? inbox.grupos.map(normalizarGrupo)
                : []
        };

        await chrome.storage.local.set({
            [STORAGE_KEY]: dados
        });

        return dados;

    },

    async carregarGrupos() {

        const inbox = await this.carregarInbox();
        return inbox.grupos;

    },

    async salvarGrupos(grupos = [], extras = {}) {

        const inboxAtual = await this.carregarInbox();

        return this.salvarInbox({
            ...inboxAtual,
            ...extras,
            grupos
        });

    },

    async atualizarStatusGrupo(grupoId, status) {

        const inbox = await this.carregarInbox();

        const grupos = inbox.grupos.map(grupo => {

            if (grupo.id !== grupoId) {
                return grupo;
            }

            return {
                ...grupo,
                status,
                visto: true,
                vistoEm: grupo.vistoEm || new Date().toISOString(),
                ehNovo: false
            };

        });

        return this.salvarInbox({
            ...inbox,
            grupos
        });

    },

    async marcarGrupoComoVisto(grupoId) {

        const inbox = await this.carregarInbox();

        const grupos = inbox.grupos.map(grupo => {

            if (grupo.id !== grupoId || grupo.visto) {
                return grupo;
            }

            return {
                ...grupo,
                visto: true,
                vistoEm: new Date().toISOString(),
                ehNovo: false
            };

        });

        return this.salvarInbox({
            ...inbox,
            grupos
        });

    },

    async salvarUltimaSincronizacao(valor) {

        const inbox = await this.carregarInbox();

        return this.salvarInbox({
            ...inbox,
            ultimaSincronizacao: valor
        });

    }

};
