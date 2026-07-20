console.log("✅ content.js carregado");

chrome.runtime.onMessage.addListener(

    (request, sender, sendResponse) => {

        console.log("Mensagem recebida:", request);

        switch (request.action) {

            case "inspecionar":

                sendResponse(
                    BSITInspector.inspecionarPagina()
                );

                break;

            case "analisarTabela":

                sendResponse(
                    BSITInspector.analisarTabelaPrincipal()
                );

                break;

            case "analisarLinha":

                sendResponse(
                    BSITInspector.analisarPrimeiraLinha()
                );

                break;

            case "testarAcoes":

                sendResponse(
                    BSITInspector.testarAcoes()
                );

                break;

            default:

                sendResponse({
                    erro: "Ação desconhecida."
                });

        }

        return true;

    }

);