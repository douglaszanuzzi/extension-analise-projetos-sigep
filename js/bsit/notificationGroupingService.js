import { NotificationGroup } from "../models/notificationGroup.js";
import { StorageService } from "../storage/notificationStorageService.js";

export const NOTIFICATION_GROUP_STATUS = Object.freeze({
    NEW: "NEW",
    PENDING: "PENDING",
    DONE: "DONE",
    ARCHIVED: "ARCHIVED"
});

export const NOTIFICATION_GROUP_WINDOW_MINUTES = 15;

export const NOTIFICATION_SYNC_INTERVAL_MINUTES = 30;

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

function dataOrdenacaoGrupo(grupo = {}) {

    const valor =
        grupo.ultimaAtualizacaoEm
        || grupo.dataFim
        || grupo.dataInicio
        || "";

    const dataIso = new Date(valor);

    if (!Number.isNaN(dataIso.getTime())) {
        return dataIso.getTime();
    }

    const dataTexto = stringParaData(valor);

    if (dataTexto) {
        return dataTexto.getTime();
    }

    return 0;

}

function ordenarGruposCaixa(grupos = []) {

    return [...grupos].sort((a, b) => {

        const aNovo = !a.visto;
        const bNovo = !b.visto;

        if (aNovo !== bNovo) {
            return aNovo ? -1 : 1;
        }

        const dataB = dataOrdenacaoGrupo(b);
        const dataA = dataOrdenacaoGrupo(a);

        if (dataA !== dataB) {
            return dataB - dataA;
        }

        return String(a.id || "").localeCompare(String(b.id || ""));

    });

}

function obterTempoAtual() {

    return new Date().toISOString();

}

function formatarUltimaAtualizacao(valor = "") {

    if (!valor) {
        return "Ainda não sincronizado";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Ainda não sincronizado";
    }

    const agora = new Date();
    const diferencaMs = agora.getTime() - data.getTime();
    const diferencaMinutos = Math.max(0, Math.round(diferencaMs / 60000));

    if (diferencaMinutos < 1) {
        return "Atualizado agora";
    }

    if (diferencaMinutos === 1) {
        return "Atualizado há 1 minuto";
    }

    return `Atualizado há ${diferencaMinutos} minutos`;

}

export const NotificationGroupingService = {

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
            primeiraNotificacaoEm: primeira.data || "",
            ultimaAtualizacaoEm: obterTempoAtual(),
            notificacoes: ordenadas,
            arquivos: extrairArquivos(ordenadas),
            ehNovo: true,
            status: NOTIFICATION_GROUP_STATUS.NEW
        });

        return grupo;

    },

    mesclarGrupos(gruposPersistidos = [], gruposBsit = []) {

        const gruposPorId = new Map(
            gruposPersistidos.map(grupo => [grupo.id, grupo])
        );

        let totalNovos = 0;
        let totalAtualizados = 0;

        gruposBsit.forEach(grupoBsit => {

            const persistido = gruposPorId.get(grupoBsit.id);

            if (!persistido) {

                totalNovos++;

                gruposPorId.set(grupoBsit.id, {
                    ...grupoBsit,
                    status: NOTIFICATION_GROUP_STATUS.NEW,
                    visto: false,
                    vistoEm: "",
                    ehNovo: true,
                    primeiraNotificacaoEm: grupoBsit.dataInicio,
                    ultimaAtualizacaoEm: obterTempoAtual(),
                    arquivos: extrairArquivos(grupoBsit.notificacoes || [])
                });

                return;

            }

            const notificacoesAtuais = persistido.notificacoes || [];
            const notificacoesNovas = grupoBsit.notificacoes || [];
            const houveMudanca =
                notificacoesNovas.length !== notificacoesAtuais.length
                || grupoBsit.dataFim !== persistido.dataFim
                || grupoBsit.proprietario !== persistido.proprietario
                || grupoBsit.cci !== persistido.cci;

            if (!houveMudanca) {
                return;
            }

            totalAtualizados++;

            gruposPorId.set(grupoBsit.id, {
                ...persistido,
                cci: grupoBsit.cci,
                proprietario: grupoBsit.proprietario,
                dataInicio: persistido.dataInicio || grupoBsit.dataInicio,
                dataFim: grupoBsit.dataFim,
                notificacoes: notificacoesNovas,
                ultimaAtualizacaoEm: obterTempoAtual(),
                arquivos: extrairArquivos(notificacoesNovas),
                // Status do usuario sempre prevalece sobre dados vindos do BSIT.
                status: persistido.status,
                visto: persistido.visto,
                vistoEm: persistido.vistoEm || "",
                ehNovo: !persistido.visto
            });

        });

        return {
            grupos: ordenarGruposCaixa(
                Array.from(gruposPorId.values())
            ),
            totalNovos,
            totalAtualizados
        };

    },

    ordenarGrupos(grupos = []) {

        return ordenarGruposCaixa(grupos);

    },

    async sincronizarGrupos(notificacoes = [], gruposPersistidos = []) {

        const gruposBsit = this.agruparNotificacoes(notificacoes);
        const sincronizacao = this.mesclarGrupos(
            gruposPersistidos,
            gruposBsit
        );

        const ultimaAtualizacaoIso = obterTempoAtual();

        return {
            ...sincronizacao,
            ultimaAtualizacao: formatarUltimaAtualizacao(ultimaAtualizacaoIso),
            ultimaAtualizacaoIso
        };

    },

    async atualizarStatus(id, status) {

        const inbox = await StorageService.atualizarStatusGrupo(id, status);

        return inbox;

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
