import { iniciarPopup } from "../js/ui/popupController.js";
import { Logger } from "../js/core/logger.js";

globalThis.addEventListener("unhandledrejection", event => {
    Logger.error("Promise rejeitada no popup.", event.reason);
});

globalThis.addEventListener("error", event => {
    Logger.error("Erro inesperado no popup.", event.error);
});

document.addEventListener("DOMContentLoaded", () => {

    iniciarPopup().catch(erro => {
        Logger.error("Falha ao iniciar popup.", erro);
    });

});
