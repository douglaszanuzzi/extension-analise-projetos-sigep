import { Logger } from "../core/logger.js";

let ultimasAnalises = [];

function obterAnalistaSelecionado() {

    const filtro =
        document.getElementById("filtroAnalista");

    return filtro?.value || "";

}

function renderizarAnalises(analises) {

    const tbody =
        document.querySelector(
            "#tblAnalises tbody"
        );

    tbody.innerHTML = "";

    const analistaSelecionado =
        obterAnalistaSelecionado();

    const filtradas = analistaSelecionado
        ? analises.filter(
            item => item.responsavel === analistaSelecionado
        )
        : analises;

    filtradas.forEach(item => {

        const tr =
            document.createElement("tr");

        if (item.responsavel) {

            tr.classList.add(
                `linha-${item.responsavel.toLowerCase()}`
            );

        }

        [
            item.proprietario,
            item.area,
            item.usoImovel,
            item.tipo
        ].forEach(valor => {

            const td =
                document.createElement("td");

            td.textContent = valor || "";

            tr.appendChild(td);

        });

        const tdResponsavel =
            document.createElement("td");

        tdResponsavel.textContent = item.responsavel || "";

        if (item.responsavel) {

            tdResponsavel.classList.add("responsavel");

        }

        tr.appendChild(tdResponsavel);

        const tdAcao =
            document.createElement("td");

        const botaoAbrir =
            document.createElement("button");

        botaoAbrir.type = "button";
        botaoAbrir.className = "btnAbrirObra";
        botaoAbrir.textContent = "Abrir";
        botaoAbrir.disabled = !item.urlObra;

        botaoAbrir.addEventListener("click", () => {

            if (!item.urlObra) {
                return;
            }

            chrome.tabs.create({
                url: item.urlObra
            });

        });

        tdAcao.appendChild(botaoAbrir);

        tr.appendChild(tdAcao);

        tbody.appendChild(tr);

    });

}

function contarPorResponsavel(analises) {

    return analises.reduce((totais, item) => {

        const responsavel = item.responsavel || "Sem responsavel";

        totais[responsavel] =
            (totais[responsavel] || 0) + 1;

        return totais;

    }, {});

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

            if (resposta.erro) {

                const resumo =
                    document.getElementById("resumo");

                resumo.textContent = resposta.erro;

                return;

            }

            //-----------------------------------------

            const resumo =
                document.getElementById("resumo");

            const totaisPorResponsavel =
                contarPorResponsavel(resposta.analises);

            resumo.innerHTML = `

                <strong>Pendentes:</strong>
                ${resposta.resumo.semAnalise}

                <br>

                <strong>Total:</strong>
                ${resposta.resumo.total}

                <br>

                <strong>Douglas:</strong>
                ${totaisPorResponsavel.Douglas || 0}

                |

                <strong>Gabriel:</strong>
                ${totaisPorResponsavel.Gabriel || 0}

            `;

            //-----------------------------------------

            ultimasAnalises = resposta.analises;

            renderizarAnalises(ultimasAnalises);

        }

    );

}

export async function iniciarPopup() {

    Logger.info("Popup iniciado.");

    document

        .getElementById("btnTabela")
        .addEventListener(

            "click",
            () => enviarAcao("analisarTabela")

    );
    document

        .getElementById("filtroAnalista")
        .addEventListener(

            "change",
            () => renderizarAnalises(ultimasAnalises)

    );

}
