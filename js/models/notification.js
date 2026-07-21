export class Notification {

    constructor(data = {}) {

        this.id = data.id ?? "";

        this.titulo = data.titulo ?? "";

        this.mensagem = data.mensagem ?? "";

        this.tipo = data.tipo ?? "informacao";

        this.data = data.data ?? "";

        this.link = data.link ?? "";

        this.lida = data.lida ?? false;

        this.origem = data.origem ?? "BSIT";

        this.cci = data.cci ?? "";

        this.proprietario = data.proprietario ?? "";

        this.arquivo = data.arquivo ?? "";

    }

    toJSON() {

        return {

            id: this.id,

            titulo: this.titulo,

            mensagem: this.mensagem,

            tipo: this.tipo,

            data: this.data,

            link: this.link,

            lida: this.lida,

            origem: this.origem,

            cci: this.cci,

            proprietario: this.proprietario,

            arquivo: this.arquivo

        };

    }

}