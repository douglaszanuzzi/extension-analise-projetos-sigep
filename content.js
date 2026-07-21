console.log("content.js carregado");

chrome.runtime.onMessage.addListener(

    (request, sender, sendResponse) => {

        console.log("Mensagem recebida:", request);

        (async () => {

            switch (request.action) {

                case "inspecionar":

                    sendResponse(
                        BSITInspector.inspecionarPagina()
                    );

                    break;

                case "analisarTabela":

                    sendResponse(
                        await BSITInspector.analisarTabelaPrincipal()
                    );

                    break;

                case "analisarLinha":

                    sendResponse(
                        BSITInspector.analisarPrimeiraLinha()
                    );

                    break;

                case "obterNotificacoes":

                    await NotificationService.aguardarPopup();

                    const respostaNotificacoes =
                        NotificationService.extrairNotificacoes();

                    sendResponse(respostaNotificacoes);

                    break;

                case "testarAcoes":

                    sendResponse(
                        BSITInspector.testarAcoes()
                    );

                    break;

                default:

                    sendResponse({
                        erro: "Acao desconhecida."
                    });

            }

        })().catch(erro => {

            console.error("Erro ao processar mensagem:", erro);

            sendResponse({
                erro: erro.message
            });

        });

        return true;

    }

);
