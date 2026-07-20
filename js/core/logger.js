export const Logger = {

    info(...args){
        console.log("[Habitese]", ...args);
    },

    warn(...args){
        console.warn("[Habitese]", ...args);
    },

    error(...args){
        console.error("[Habitese]", ...args);
    }

};