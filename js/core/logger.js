import { CONFIG } from "./config.js";

function debugAtivo() {

    return CONFIG.DEBUG === true;

}
import { isDebugAtivo } from "./debug.js";

export async function info(mensagem, ...args) {
    const ativo = await isDebugAtivo();
    if (ativo) {
        console.info(`[Logger] ${mensagem}`, ...args);
    }
}

export async function warn(mensagem, ...args) {
    const ativo = await isDebugAtivo();
    if (ativo) {
        console.warn(`[Logger] ${mensagem}`, ...args);
    }
}

export async function error(mensagem, ...args) {
    const ativo = await isDebugAtivo();
    if (ativo) {
        console.error(`[Logger] ${mensagem}`, ...args);
    }
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
