import {
    NotificationGroupingService,
    NOTIFICATION_SYNC_INTERVAL_MINUTES
} from "./notificationGroupingService.js";
import { StorageService } from "../storage/notificationStorageService.js";
import { Logger } from "../core/logger.js";
import { safeSendMessage } from "../core/chromeMessaging.js";

function obterTempoAtual() {

    return new Date().toISOString();

}

function formatarUltimaAtualizacao(valor = "") {

    if (!valor) {
        return "Ainda nao sincronizado";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Ainda nao sincronizado";
    }

    const diferencaMinutos = Math.max(
        0,
        Math.round((Date.now() - data.getTime()) / 60000)
    );

    if (diferencaMinutos < 1) {
        return "Atualizado agora";
    }

    if (diferencaMinutos === 1) {
        return "Atualizado ha 1 minuto";
    }

    return `Atualizado ha ${diferencaMinutos} minutos`;

}

export const NotificationService = {

    INTERVALO_MINUTOS: NOTIFICATION_SYNC_INTERVAL_MINUTES,

    async carregarInbox() {

        try {

            const inbox = await StorageService.carregarInbox();
            const grupos =
                NotificationGroupingService.ordenarGrupos(inbox.grupos || []);

            return {
                ...inbox,
                grupos,
                ultimaAtualizacaoTexto: formatarUltimaAtualizacao(
                    inbox.ultimaSincronizacao
                )
            };

        } catch (erro) {

            Logger.error("Falha ao carregar notificacoes.", erro);

            return {
                grupos: [],
                ultimaSincronizacao: "",
                totalNovos: 0,
                ultimaAtualizacaoTexto: formatarUltimaAtualizacao()
            };

        }


    },

 async localizarAbaBsit() {
    try {
        const abas = await chrome.tabs.query({
            url: [
                "http://jatai.bsit-br.com.br/*",
                "https://jatai.bsit-br.com.br/*",
                "http://jatai.sigep.com.br/*",
                "https://jatai.sigep.com.br/*"
            ]
        });
        return abas[0] || null;
    } catch (erro) {
        Logger.warn("Falha ao localizar aba do BSIT.", erro);
        return null;
    }
},

    async buscarNotificacoesNoBsit() {

        const aba = await this.localizarAbaBsit();

        if (!aba) {
            return {
                erro: "Abra o BSIT para sincronizar notificacoes."
            };
        }

        return safeSendMessage(
            aba,
            {
                action: "obterNotificacoes"
            }
        );

    },

    async sync() {

        try {

            const inboxAtual = await StorageService.carregarInbox();
            const resposta = await this.buscarNotificacoesNoBsit();

            if (!resposta || resposta.erro) {
                return {
                    ...inboxAtual,
                    erro: resposta?.erro || "Nao foi possivel sincronizar notificacoes.",
                    ultimaAtualizacaoTexto: formatarUltimaAtualizacao(
                        inboxAtual.ultimaSincronizacao
                    )
                };
            }

            const sincronizacao =
                await NotificationGroupingService.sincronizarGrupos(
                    resposta.notificacoes || [],
                    inboxAtual.grupos || []
                );

            const gruposOrdenados =
                NotificationGroupingService.ordenarGrupos(
                    sincronizacao.grupos
                );

            const inboxAtualizado = await StorageService.salvarInbox({
                grupos: gruposOrdenados,
                ultimaSincronizacao: sincronizacao.ultimaAtualizacaoIso,
                totalNovos: gruposOrdenados.filter(
                    grupo => !grupo.visto
                ).length
            });

            await this.atualizarBadge(inboxAtualizado.grupos);

            return {
                ...inboxAtualizado,
                totalNovosSincronizacao: sincronizacao.totalNovos,
                totalAtualizados: sincronizacao.totalAtualizados,
                ultimaAtualizacaoTexto: formatarUltimaAtualizacao(
                    inboxAtualizado.ultimaSincronizacao
                )
            };

        } catch (erro) {

            Logger.error("Falha ao sincronizar notificacoes.", erro);

            const inboxAtual = await StorageService.carregarInbox();

            return {
                ...inboxAtual,
                erro: "Nao foi possivel sincronizar notificacoes.",
                ultimaAtualizacaoTexto: formatarUltimaAtualizacao(
                    inboxAtual.ultimaSincronizacao
                )
            };

        }

    },

    async atualizarStatus(grupoId, status) {

        try {

            const inbox = await StorageService.atualizarStatusGrupo(
                grupoId,
                status
            );
            const grupos =
                NotificationGroupingService.ordenarGrupos(inbox.grupos || []);

            await this.atualizarBadge(grupos);

            return {
                ...inbox,
                grupos,
                ultimaAtualizacaoTexto: formatarUltimaAtualizacao(
                    inbox.ultimaSincronizacao
                )
            };

        } catch (erro) {

            Logger.error("Falha ao atualizar status.", erro);

            return this.carregarInbox();

        }

    },

    async marcarComoVisto(grupoId) {

        try {

            const inbox = await StorageService.marcarGrupoComoVisto(grupoId);
            const grupos =
                NotificationGroupingService.ordenarGrupos(inbox.grupos || []);

            await this.atualizarBadge(grupos);

            return {
                ...inbox,
                grupos,
                ultimaAtualizacaoTexto: formatarUltimaAtualizacao(
                    inbox.ultimaSincronizacao
                )
            };

        } catch (erro) {

            Logger.error("Falha ao marcar grupo como visto.", erro);

            return this.carregarInbox();

        }

    },

    async atualizarBadge(grupos = []) {

        if (!chrome?.action?.setBadgeText) {
            return;
        }

        const totalNovos = grupos.filter(
            grupo => !grupo.visto
        ).length;

        try {

            await chrome.action.setBadgeText({
                text: totalNovos ? String(totalNovos) : ""
            });

            await chrome.action.setBadgeBackgroundColor({
                color: "#1d4f8f"
            });

        } catch (erro) {

            Logger.warn("Falha ao atualizar badge.", erro);

        }

    },

    getUltimaAtualizacaoTexto(valor = "") {

        return formatarUltimaAtualizacao(valor || obterTempoAtual());

    }

};
