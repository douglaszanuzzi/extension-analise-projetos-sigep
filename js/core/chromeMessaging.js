import { Logger } from "./logger.js";

const DOMINIOS_PERMITIDOS = [
    "jatai.bsit-br.com.br",
    "jatai.sigep.com.br"
];
const DEFAULT_TIMEOUT_MS = 8000;

function erroEsperado(mensagem = "") {
    return mensagem.includes("Receiving end does not exist")
        || mensagem.includes("Could not establish connection")
        || mensagem.includes("No tab with id")
        || mensagem.includes("The message port closed");
}

function criarErro(mensagem, detalhes = {}) {
    return {
        erro: mensagem,
        esperado: Boolean(detalhes.esperado),
        detalhes
    };
}

function isDominioPermitido(url) {
    try {
        const parsed = new URL(url);
        return DOMINIOS_PERMITIDOS.includes(parsed.hostname);
    } catch {
        return false;
    }
}

function validarAbaBsit(tab) {
    if (!tab || typeof tab.id !== "number") {
        return "Aba de destino invalida.";
    }
    if (tab.url && !isDominioPermitido(tab.url)) {
        return "A aba ativa nao pertence ao BSIT.";
    }
    return "";
}

export function safeSendMessage(tab, mensagem, opcoes = {}) {
    const timeoutMs = opcoes.timeoutMs || DEFAULT_TIMEOUT_MS;
    const erroValidacao = validarAbaBsit(tab);
    if (erroValidacao) {
        Logger.warn(erroValidacao, { tab });
        return Promise.resolve(criarErro(erroValidacao, {
            esperado: true,
            origem: "validacao"
        }));
    }
    return new Promise(resolve => {
        let finalizado = false;
        let timeoutId = null;
        const finalizar = resposta => {
            if (finalizado) {
                return;
            }
            finalizado = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            resolve(resposta);
        };
        timeoutId = setTimeout(() => {
            const erro = criarErro(
                "Tempo limite aguardando resposta da pagina do SIGEP.",
                {
                    esperado: true,
                    origem: "timeout",
                    tabId: tab.id,
                    timeoutMs
                }
            );
            Logger.warn(erro.erro, erro.detalhes);
            finalizar(erro);
        }, timeoutMs);
        try {
            const resultado = chrome.tabs.sendMessage(
                tab.id,
                mensagem,
                resposta => {
                    const lastError = chrome.runtime.lastError;
                    if (lastError) {
                        const texto = lastError.message || "";
                        const erro = criarErro(texto, {
                            esperado: erroEsperado(texto),
                            origem: "runtime.lastError",
                            tabId: tab.id
                        });
                        if (erro.esperado) {
                            Logger.warn("Falha esperada ao comunicar com content script.", erro);
                        } else {
                            Logger.error("Falha inesperada ao comunicar com content script.", erro);
                        }
                        finalizar(erro);
                        return;
                    }
                    finalizar(resposta || null);
                }
            );
            if (resultado?.catch) {
                resultado.catch(erro => {
                    const texto = erro?.message || String(erro || "");
                    const respostaErro = criarErro(texto, {
                        esperado: erroEsperado(texto),
                        origem: "promise",
                        tabId: tab.id
                    });
                    if (respostaErro.esperado) {
                        Logger.warn("Promise esperada rejeitada ao enviar mensagem.", respostaErro);
                    } else {
                        Logger.error("Promise inesperada rejeitada ao enviar mensagem.", erro);
                    }
                    finalizar(respostaErro);
                });
            }
        } catch (erro) {
            const texto = erro?.message || String(erro || "");
            const respostaErro = criarErro(texto, {
                esperado: erroEsperado(texto),
                origem: "exception",
                tabId: tab.id
            });
            if (respostaErro.esperado) {
                Logger.warn("Falha esperada ao enviar mensagem.", respostaErro);
            } else {
                Logger.error("Falha inesperada ao enviar mensagem.", erro);
            }
            finalizar(respostaErro);
        }
    });
}