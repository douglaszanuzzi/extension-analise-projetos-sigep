import { NotificationGroup } from "../models/notificationGroup.js";

export const NOTIFICATION_GROUP_STATUS = Object.freeze({
    NEW: "NEW",
    PENDING: "PENDING",
    DONE: "DONE",
    ARCHIVED: "ARCHIVED"
});

export const NOTIFICATION_GROUP_WINDOW_MINUTES = 10;

const STORAGE_PREFIX = "notificationGroupStatus_";

function stringParaData(valor = "") {

    if (!valor) {
        return null;
    }

    const match = String(valor).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);

    if (!match) {
        return null;
    }

    const [, dia, mes, ano, hora, minuto] = match;
    return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));

}

function dataParaTexto(data) {

    if (!data) {
        return "";
    }

    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, "0");
    const minuto = String(data.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;

}

function gerarIdGrupo(cci = "", dataInicio = "") {

    const dataBase = stringParaData(dataInicio);

    if (!dataBase) {
        return `sem-data_${String(cci || "sem-cci").trim()}`;
    }

    const timestamp = [
        dataBase.getFullYear(),
        String(dataBase.getMonth() + 1).padStart(2, "0"),
        String(dataBase.getDate()).padStart(2, "0")
    ].join("");

    const hora = [
        String(dataBase.getHours()).padStart(2, "0"),
        String(dataBase.getMinutes()).padStart(2, "0"),
        String(dataBase.getSeconds()).padStart(2, "0")
    ].join("");

    return `${String(cci || "sem-cci").trim()}_${timestamp}T${hora}`;

}

function obterStatusTexto(status = NOTIFICATION_GROUP_STATUS.NEW) {

    const mapa = {
        [NOTIFICATION_GROUP_STATUS.NEW]: "Novo",
        [NOTIFICATION_GROUP_STATUS.PENDING]: "Aguardando",
        [NOTIFICATION_GROUP_STATUS.DONE]: "Concluído",
        [NOTIFICATION_GROUP_STATUS.ARCHIVED]: "Arquivado"
    };

    return mapa[status] || "Novo";

}

function extrairArquivos(notificacoes = []) {

    return notificacoes
        .map(item => item.arquivo || item.titulo || "")
        .filter(Boolean)
        .filter((valor, indice, lista) => lista.indexOf(valor) === indice);

}

function ordenarNotificacoes(notificacoes = []) {

    return [...notificacoes].sort((a, b) => {

        const dataA = stringParaData(a.data) || new Date(0);
        const dataB = stringParaData(b.data) || new Date(0);

        return dataA.getTime() - dataB.getTime();

    });

}

export const NotificationGroupingService = {

    async carregarStatusPersistidos() {

        const dados = await chrome.storage.local.get(null);
        const mapa = {};

        Object.entries(dados).forEach(([chave, valor]) => {

            if (chave.startsWith(STORAGE_PREFIX)) {
                mapa[chave.replace(STORAGE_PREFIX, "")] = valor;
            }

        });

        return mapa;

    },

    async salvarStatus(id, status) {

        if (!id) {
            return;
        }

        await chrome.storage.local.set({
            [`${STORAGE_PREFIX}${id}`]: status
        });

    },

    agruparNotificacoes(notificacoes = []) {

        const ordenadas = ordenarNotificacoes(notificacoes);
        const grupos = [];
        let grupoAtual = null;

        ordenadas.forEach(notificacao => {

            const cci = String(notificacao.cci || "").trim();
            const dataAtual = stringParaData(notificacao.data);

            if (!dataAtual) {
                return;
            }

            if (!grupoAtual) {
                grupoAtual = this.criarGrupo([notificacao]);
                grupos.push(grupoAtual);
                return;
            }

            const ultimaNotificacao = grupoAtual.notificacoes[grupoAtual.notificacoes.length - 1];
            const ultimaData = stringParaData(ultimaNotificacao.data);
            const diferenca = dataAtual.getTime() - ultimaData.getTime();
            const mesmaReferencia = grupoAtual.cci === cci;

            if (mesmaReferencia && diferenca <= NOTIFICATION_GROUP_WINDOW_MINUTES * 60 * 1000) {
                grupoAtual.notificacoes.push(notificacao);
                grupoAtual.dataFim = notifDataMaisRecente(grupoAtual.notificacoes);
                return;
            }

            grupoAtual = this.criarGrupo([notificacao]);
            grupos.push(grupoAtual);

        });

        return grupos;

    },

    criarGrupo(notificacoes = []) {

        const ordenadas = ordenarNotificacoes(notificacoes);
        const primeira = ordenadas[0] || {};
        const ultima = ordenadas[ordenadas.length - 1] || {};

        const grupo = new NotificationGroup({
            id: gerarIdGrupo(primeira.cci, primeira.data),
            cci: primeira.cci || "",
            proprietario: primeira.proprietario || "",
            dataInicio: primeira.data || "",
            dataFim: ultima.data || "",
            notificacoes: ordenadas,
            status: NOTIFICATION_GROUP_STATUS.NEW
        });

        return grupo;

    },

    async sincronizarGrupos(notificacoes = []) {

        const gruposTemporarios = this.agruparNotificacoes(notificacoes);
        const statusPersistidos = await this.carregarStatusPersistidos();

        return gruposTemporarios.map(grupo => ({
            ...grupo,
            status: statusPersistidos[grupo.id] || grupo.status
        }));

    },

    async atualizarStatus(id, status) {

        await this.salvarStatus(id, status);

        return status;

    },

    statusTexto(status) {

        return obterStatusTexto(status);

    },

    contarArquivos(grupo) {

        return extrairArquivos(grupo.notificacoes || []).length;

    },

    exibirGrupo(grupo) {

        const arquivos = extrairArquivos(grupo.notificacoes || []);

        return {
            ...grupo,
            arquivos,
            totalArquivos: arquivos.length,
            statusTexto: obterStatusTexto(grupo.status)
        };

    }

};

function notifDataMaisRecente(notificacoes = []) {

    const ordenadas = ordenarNotificacoes(notificacoes);
    const ultima = ordenadas[ordenadas.length - 1] || {};

    return ultima.data || "";

}
