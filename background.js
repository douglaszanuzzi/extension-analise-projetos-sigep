import { NotificationService } from "./js/bsit/notificationService.js";

const NOTIFICATION_SYNC_ALARM = "notificationInboxSync";

console.log("Background iniciado.");

function configurarSidePanel() {

    if (!chrome.sidePanel) {
        return;
    }

    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
    });

}

function configurarSincronizacaoAutomatica() {

    chrome.alarms.create(NOTIFICATION_SYNC_ALARM, {
        periodInMinutes: NotificationService.INTERVALO_MINUTOS
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

    if (alarm.name !== NOTIFICATION_SYNC_ALARM) {
        return;
    }

    try {

        await NotificationService.sync();

    } catch (erro) {

        console.warn("[Habitese] Falha na sincronizacao automatica.", erro);

    }

});

configurarSidePanel();
configurarSincronizacaoAutomatica();
