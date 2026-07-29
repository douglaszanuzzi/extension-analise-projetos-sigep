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

        if (!chrome.sidePanel) {
            return;
        }

        const resultado = chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: true
        });

        if (resultado?.catch) {
            resultado.catch(erro => {
                Logger.warn("Falha ao aplicar comportamento do side panel.", erro);
            });
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
            resultado.catch(erro => {
                Logger.warn("Falha ao criar alarme de sincronizacao.", erro);
            });
        }

    } catch (erro) {

        Logger.warn("Falha ao configurar alarme de sincronizacao.", erro);

    }

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

    if (alarm.name !== NOTIFICATION_SYNC_ALARM) {
        return;
    }

    try {

        await NotificationService.sync();

    } catch (erro) {

        Logger.warn("Falha na sincronizacao automatica.", erro);

    }

});

configurarSidePanel();
configurarSincronizacaoAutomatica();
