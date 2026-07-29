function notificacoesDebugAtivo() {

    return globalThis.HABITESE_DEBUG !== false;

}

function notificacoesWarn(...args) {

    if (notificacoesDebugAtivo()) {
        console.warn(...args);
    }

}

function notificacoesError(...args) {

    if (notificacoesDebugAtivo()) {
        console.error(...args);
    }

}

const NotificationInspector = {

    localizarContainer() {

        return document.getElementById(
            "notificationModalContentTable"
        );

    },

    parseNotificationMessage(message = "") {

        const texto = String(message || "").trim();

        const cci = (
            texto.match(/CCI:\s*([A-Za-z0-9]+)/i) || []
        )[1] || "";

        const proprietario = (
            texto.match(
                /cujo\s+(?:propriet(?:a|á)rio\(a\)|proprietario\(a\))\s+principal\s+(?:é|e):\s*(.*?)\s+teve\s+o\s+arquivo:/i
            ) || []
        )[1] || "";

        const arquivo = (
            texto.match(
                /teve\s+o\s+arquivo:\s*(.*?)\s+(?:Alterado\/Cadastrado|Alterado|Cadastrado)\s+na\s+data\s+de/i
            ) || []
        )[1] || "";

        return {
            cci: cci.trim(),
            proprietario: proprietario.trim(),
            arquivo: arquivo.trim()
        };

    },

    extrairNotificacoes() {

        const container = this.localizarContainer();

        if (!container) {

            return {
                erro: "Tabela de notificações não encontrada."
            };

        }

        const formulario = document.getElementById(
            "notificationModalForm"
        );

        if (!formulario) {

            return {
                erro: "Popup de notificações não encontrada."
            };

        }

        const linhas = Array.from(
            formulario.querySelectorAll("table tbody tr")
        );

        const notificacoes = [];

        let atual = null;

        linhas.forEach(linha => {

            const label = linha.querySelector("label");
            const campo = linha.querySelector("input, textarea");

            const textoLabel = label
                ? label.innerText.replace(/\s+/g, " ").trim()
                : "";

            if (!textoLabel && !campo) {
                return;
            }

            if (textoLabel === "Título:" && campo) {

                if (atual && atual.titulo) {
                    notificacoes.push(atual);
                }

                atual = {
                    id: `notificacao-${notificacoes.length + 1}`,
                    titulo: campo.value.trim(),
                    mensagem: "",
                    data: "",
                    link: "",
                    lida: false,
                    tipo: "informacao",
                    origem: "BSIT",
                    cci: "",
                    proprietario: "",
                    arquivo: ""
                };

                return;

            }

            if (!atual) {
                return;
            }

            if (textoLabel === "Mensagem:" && campo) {
                atual.mensagem = campo.value.trim();
                const extraidos = this.parseNotificationMessage(atual.mensagem);
                atual.cci = extraidos.cci;
                atual.proprietario = extraidos.proprietario;
                atual.arquivo = extraidos.arquivo;
                return;
            }

            if (textoLabel === "Data:" && campo) {
                atual.data = campo.value.trim();
                return;
            }

            if (textoLabel === "Criado Por:" && campo) {
                atual.link = campo.value.trim();
            }

        });

        if (atual && atual.titulo) {
            notificacoes.push(atual);
        }

        return {
            notificacoes
        };

    }

};

const NotificationService = {

    MAX_WAIT_MS: 5000,

    localizarBotao() {

        const idBotao = "headerActions:commandLinkNotifications";

        const botao = document.getElementById(idBotao)
            || document.querySelector(
                "#headerActions\\:commandLinkNotifications"
            );

        if (!botao) {
            notificacoesError("[Habitese] Botão de notificações não encontrado.");
        }

        return botao;

    },

    popupEstaVisivel() {

        try {

            const popup = document.getElementById("notificationModal");
            const popupContainer = document.getElementById("notificationModalContainer");

            if (!popup && !popupContainer) {
                return false;
            }

            const displayPopup = popup
                ? window.getComputedStyle(popup).display
                : "none";

            const displayContainer = popupContainer
                ? window.getComputedStyle(popupContainer).display
                : "none";

            return displayPopup !== "none"
                || displayContainer !== "none";

        } catch (erro) {

            notificacoesWarn("[Habitese] Falha ao verificar popup de notificacoes.", erro);
            return false;

        }

    },

    async abrirPopup() {

        const popupJaAberta = this.popupEstaVisivel();

        if (popupJaAberta) {
            return {
                aberta: true
            };
        }

        const botao = this.localizarBotao();

        if (!botao && typeof window.Richfaces?.showModalPanel !== "function") {
            return {
                erro: "Botão de notificações e API pública do RichFaces não encontradas."
            };
        }

        try {

            if (typeof window.Richfaces?.showModalPanel === "function") {
                window.Richfaces.showModalPanel("notificationModal");
            } else {
                botao.click();
            }

        } catch (erro) {

            return {
                erro: "Nao foi possivel abrir o popup de notificacoes."
            };

        }

        return this.aguardarPopup();

    },

    aguardarPopup() {

        return new Promise((resolve, reject) => {

            const popup = document.getElementById("notificationModal");
            const popupContainer = document.getElementById("notificationModalContainer");

            const jaVisivel = this.popupEstaVisivel();

            if (jaVisivel) {
                resolve({ popup, popupContainer });
                return;
            }

            let observer = null;

            const timeoutId = window.setTimeout(() => {
                if (observer) {
                    observer.disconnect();
                }
                notificacoesError("[Habitese] Timeout aguardando popup de notificações.");
                reject(new Error("Timeout aguardando popup de notificações."));
            }, this.MAX_WAIT_MS);

            observer = new MutationObserver(() => {

                const visivel = this.popupEstaVisivel();

                if (visivel) {
                    window.clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve({ popup, popupContainer });
                }

            });

            try {

                if (!document.body) {
                    window.clearTimeout(timeoutId);
                    reject(new Error("Pagina ainda nao carregada."));
                    return;
                }

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ["style", "class"]
                });

            } catch (erro) {

                window.clearTimeout(timeoutId);
                if (observer) {
                    observer.disconnect();
                }
                reject(erro);

            }

        });

    },

    extrairNotificacoes() {

        return NotificationInspector.extrairNotificacoes();

    },

    async sync() {

        const resultado = await this.obterNotificacoes();

        return {
            ...resultado,
            sincronizadoEm: new Date().toISOString()
        };

    },

    async obterNotificacoes() {

        let popupJaAberta = false;

        try {

            popupJaAberta = this.popupEstaVisivel();

            if (!popupJaAberta) {

                const abertura = await this.abrirPopup();

                if (abertura && abertura.erro) {
                    return abertura;
                }

            }

            await this.aguardarPopup();

            const resultado = this.extrairNotificacoes();

            if (!resultado || resultado.erro) {
                notificacoesError("[Habitese] Erro ao ler popup de notificações.", resultado?.erro || "Erro desconhecido.");
                return resultado || {
                    erro: "Erro ao ler popup de notificações."
                };
            }

            if (!resultado.notificacoes || !resultado.notificacoes.length) {
                notificacoesWarn("[Habitese] Popup de notificações aberta, mas sem dados.");
            }

            return resultado;

        } catch (erro) {

            notificacoesError("[Habitese] Falha ao automatizar notificações.", erro);

            return {
                erro: erro.message
            };

        } finally {

            await this.fecharPopup();

        }

    },

    fecharPopup() {

        try {

            if (typeof window.Richfaces?.hideModalPanel === "function") {
                window.Richfaces.hideModalPanel("notificationModal");
                return Promise.resolve(true);
            }

            const botaoFechar = document.getElementById("notificationModalHidelink");

            if (botaoFechar && typeof botaoFechar.click === "function") {
                botaoFechar.click();
                return Promise.resolve(true);
            }

        } catch (erro) {

            notificacoesWarn("[Habitese] Falha ao fechar popup de notificacoes.", erro);

        }

        return Promise.resolve(true);

    }

};
