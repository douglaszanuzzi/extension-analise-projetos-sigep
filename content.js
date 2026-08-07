const App = globalThis.HabiteseApp || {};
const BSITInspector = App.BSITInspector;
const NotificationDomService = App.NotificationDomService;

if (!BSITInspector) {
    console.error("[Habitese] Dependência não carregada: BSITInspector");
}
if (!NotificationDomService) {
    console.error("[Habitese] Dependência não carregada: NotificationDomService");
}

function debugAtivo() {
    return globalThis.HABITESE_DEBUG !== false;
}

function registrarErro(contexto, erro) {
    if (!debugAtivo()) return;
    console.error("[Habitese]", contexto, erro);
}

function registrarAviso(contexto, erro) {
    if (!debugAtivo()) return;
    console.warn("[Habitese]", contexto, erro);
}

globalThis.addEventListener("unhandledrejection", event => {
    registrarErro("Promise rejeitada no content script.", event.reason);
});

globalThis.addEventListener("error", event => {
    registrarErro("Erro inesperado no content script.", event.error);
});

function erroAmigavel(erro) {
    const mensagem = erro?.message || String(erro || "");
    if (!mensagem) return "Nao foi possivel executar a acao na pagina do BSIT.";
    return mensagem;
}

function responderComSeguranca(sendResponse, resposta) {
    if (typeof sendResponse !== "function") {
        registrarAviso("Callback de resposta indisponivel.", resposta);
        return;
    }
    try {
        sendResponse(resposta);
    } catch (erro) {
        registrarAviso("Falha ao responder mensagem.", erro);
    }
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {

        if (!request || typeof request.action !== "string") {
            responderComSeguranca(sendResponse, { erro: "Mensagem invalida." });
            return false;
        }

        (async () => {

            switch (request.action) {

                case "inspecionar":
                    responderComSeguranca(sendResponse, BSITInspector.inspecionarPagina());
                    break;

                case "analisarTabela":
                    responderComSeguranca(sendResponse, await BSITInspector.analisarTabelaPrincipal());
                    break;

                case "analisarLinha":
                    responderComSeguranca(sendResponse, BSITInspector.analisarPrimeiraLinha());
                    break;

                case "obterNotificacoes":
                    const respostaNotificacoes = await NotificationDomService.obterNotificacoes();
                    responderComSeguranca(sendResponse, respostaNotificacoes);
                    break;

                case "testarAcoes":
                    responderComSeguranca(sendResponse, BSITInspector.testarAcoes());
                    break;

                default:
                    responderComSeguranca(sendResponse, { erro: "Acao desconhecida." });
            }

        })().catch(erro => {
            registrarErro("Erro ao processar mensagem.", erro);
            responderComSeguranca(sendResponse, { erro: erroAmigavel(erro) });
        });

        return true;
    }
);