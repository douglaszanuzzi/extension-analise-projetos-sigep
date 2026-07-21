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

    abrirPopup() {

        return Promise.resolve(
            NotificationInspector.localizarContainer()
        );

    },

    aguardarPopup() {

        return new Promise(resolve => {

            const container =
                NotificationInspector.localizarContainer();

            if (container) {
                resolve(container);
                return;
            }

            const observer = new MutationObserver(() => {

                const encontrado =
                    NotificationInspector.localizarContainer();

                if (encontrado) {
                    observer.disconnect();
                    resolve(encontrado);
                }

            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

        });

    },

    extrairNotificacoes() {

        return NotificationInspector.extrairNotificacoes();

    },

    fecharPopup() {

        return Promise.resolve(true);

    }

};