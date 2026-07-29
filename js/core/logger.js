import { CONFIG } from "./config.js";

function debugAtivo() {

    return CONFIG.DEBUG === true;

}

export const Logger = {

    info(...args){
        if (!debugAtivo()) {
            return;
        }
        console.log("[Habitese]", ...args);
    },

    warn(...args){
        if (!debugAtivo()) {
            return;
        }
        console.warn("[Habitese]", ...args);
    },

    error(...args){
        if (!debugAtivo()) {
            return;
        }
        console.error("[Habitese]", ...args);
    }

};
