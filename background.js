import { NotificationService } from "./js/bsit/notificationService.js";
import { Logger } from "./js/core/logger.js";

const NOTIFICATION_SYNC_ALARM = "notificationInboxSync";

globalThis.addEventListener("unhandledrejection", event => {
    Logger.error("Promise rejeitada no background.", event.reason);
});

globalThis.addEventListener("error", event => {
    Logger.error("Erro inesperado no background.", event.error);
});

function configurarSidePanel() {
    try {
        if (!chrome.sidePanel) return;
        const resultado = chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        if (resultado?.catch) {
            resultado.catch(erro => Logger.warn("Falha ao aplicar comportamento do side panel.", erro));
        }
    } catch (erro) {
        Logger.warn("Falha ao configurar side panel.", erro);
    }
}

function configurarSincronizacaoAutomatica() {
    try {
        const resultado = chrome.alarms.create(NOTIFICATION_SYNC_ALARM, {
            periodInMinutes: NotificationService.INTERVALO_MINUTOS
        });
        if (resultado?.catch) {
            resultado.catch(erro => Logger.warn("Falha ao criar alarme de sincronizacao.", erro));
        }
    } catch (erro) {
        Logger.warn("Falha ao configurar alarme de sincronizacao.", erro);
    }
}

function criarNotificacaoPush(totalNovos, grupos = []) {
    if (!chrome?.notifications?.create) return;

    const novosGrupos = (grupos || []).filter(g => !g.visto);
    if (novosGrupos.length === 0) return;

    const ccis = novosGrupos.slice(0, 3).map(g => g.cci || "Sem CCI").join(", ");
    const suffix = novosGrupos.length > 3 ? " e outros" : "";

    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
        title: "Habitese Robot",
        message: `${totalNovos} nova(s) notificacao(oes) do BSIT.\nCCI: ${ccis}${suffix}`,
        priority: 2
    });
}

chrome.runtime.onInstalled.addListener(() => {
    configurarSidePanel();
    configurarSincronizacaoAutomatica();
});

chrome.runtime.onStartup.addListener(() => {
    configurarSidePanel();
    configurarSincronizacaoAutomatica();
});

chrome.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name !== NOTIFICATION_SYNC_ALARM) return;
    try {
        const resultado = await NotificationService.sync();
        if (resultado && resultado.totalNovosSincronizacao > 0) {
            criarNotificacaoPush(resultado.totalNovosSincronizacao, resultado.grupos);
        }
    } catch (erro) {
        Logger.warn("Falha na sincronizacao automatica.", erro);
    }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {
        const janela = await chrome.windows.getLastFocused();
        if (janela) {
            await chrome.sidePanel.open({ windowId: janela.id });
        }
    } catch (erro) {
        Logger.warn("Falha ao abrir side panel a partir da notificacao.", erro);
    }
    chrome.notifications.clear(notificationId);
});"background.js"