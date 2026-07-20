import { Logger } from "../core/logger.js";
import { Storage } from "../core/storage.js";
async function testeStorage() {

    Logger.info("================================");
    Logger.info("TESTE DO STORAGE");
    Logger.info("================================");

    const dadosTeste = {

        ultimoAnalista: "Douglas",

        distribuicao: {

            "26004": "Douglas",
            "26005": "Gabriel",
            "26006": "Douglas"

        }

    };

    await Storage.salvar(dadosTeste);

    const dados = await Storage.carregar();

    console.table(dados.distribuicao);

    Logger.info(dados);

    Logger.info("================================");

}
async function enviarAcao(acao) {
    console.log("AÇÃO ENVIADA:", acao);
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab) {

        Logger.error("Nenhuma aba ativa.");

        return;

    }

    chrome.tabs.sendMessage(

        tab.id,

        {
            action: acao
        },

        resposta => {
            console.log("--------------------------------");
            console.log("AÇÃO:", acao);
            console.log("RESPOSTA:", resposta);
            console.log("LAST ERROR:", chrome.runtime.lastError);

            if (chrome.runtime.lastError) {

                Logger.error(chrome.runtime.lastError.message);
                return;

            }

            if (!resposta) {

                console.error("Resposta veio undefined.");

                return;

            }
            if (chrome.runtime.lastError) {

                Logger.error(
                    chrome.runtime.lastError.message
                );

                return;

            }
            if (acao === "testarAcoes") {
                return;
            }
            //-----------------------------------------

            const resumo =
                document.getElementById("resumo");

            resumo.innerHTML = `

                <strong>Pendentes:</strong>
                ${resposta.resumo.semAnalise}

                <br>

                <strong>Total:</strong>
                ${resposta.resumo.total}

            `;

            //-----------------------------------------

            const tbody =
                document.querySelector(
                    "#tblAnalises tbody"
                );

            tbody.innerHTML = "";

            //-----------------------------------------

            resposta.analises.forEach(item => {

                const tr =
                    document.createElement("tr");

                tr.innerHTML = `
                    <td>${item.proprietario}</td>
                    <td>${item.area}</td>
                    <td>${item.usoImovel}</td>
                    <td>${item.tipo}</td>
                     <td>${item.responsavel}</td>
                `;

                tbody.appendChild(tr);

            });

        }

    );

}

export async function iniciarPopup() {
    await testeStorage();
    Logger.info("Popup iniciado.");

    document

        .getElementById("btnTabela")
        .addEventListener(

            "click",
            () => enviarAcao("analisarTabela")

    );
    document

    .getElementById("btnTestarAcoes")

    .addEventListener(

        "click",

        () => enviarAcao("testarAcoes")

    );

}