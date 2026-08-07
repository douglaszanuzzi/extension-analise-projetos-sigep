const STORAGE_KEY = "debugAtivo";

let debugAtivoCache = null;

async function inicializarDebug() {
    if (debugAtivoCache !== null) return debugAtivoCache;
    try {
        const dados = await chrome.storage.local.get(STORAGE_KEY);
        debugAtivoCache = dados[STORAGE_KEY] === true;
    } catch {
        debugAtivoCache = false;
    }
    return debugAtivoCache;
}

function setDebugAtivo(valor) {
    debugAtivoCache = !!valor;
}

async function refreshDebugFlag() {
    try {
        const dados = await chrome.storage.local.get(STORAGE_KEY);
        debugAtivoCache = dados[STORAGE_KEY] === true;
    } catch {
        debugAtivoCache = false;
    }
    return debugAtivoCache;
}

chrome.storage.onChanged.addListener((alteracoes, area) => {
    if (area === "local" && alteracoes[STORAGE_KEY]) {
        debugAtivoCache = alteracoes[STORAGE_KEY].newValue === true;
    }
});

export async function isDebugAtivo() {
    if (debugAtivoCache === null) {
        await inicializarDebug();
    }
    return debugAtivoCache;
}

export { setDebugAtivo, refreshDebugFlag, STORAGE_KEY };