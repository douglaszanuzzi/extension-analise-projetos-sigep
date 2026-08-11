import { isDebugAtivo } from "./debug.js";

export const Logger = {
    async info(mensagem, ...args) {
        const ativo = await isDebugAtivo();
        if (ativo) {
            console.info(`[Logger] ${mensagem}`, ...args);
        }
    },

    async warn(mensagem, ...args) {
        const ativo = await isDebugAtivo();
        if (ativo) {
            console.warn(`[Logger] ${mensagem}`, ...args);
        }
    },

    async error(mensagem, ...args) {
        const ativo = await isDebugAtivo();
        if (ativo) {
            console.error(`[Logger] ${mensagem}`, ...args);
        }
    }
};