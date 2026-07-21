export class NotificationGroup {

    constructor(data = {}) {

        this.id = data.id ?? "";

        this.cci = data.cci ?? "";

        this.proprietario = data.proprietario ?? "";

        this.dataInicio = data.dataInicio ?? "";

        this.dataFim = data.dataFim ?? "";

        this.notificacoes = Array.isArray(data.notificacoes)
            ? data.notificacoes
            : [];

        this.status = data.status ?? "NEW";

    }

    toJSON() {

        return {
            id: this.id,
            cci: this.cci,
            proprietario: this.proprietario,
            dataInicio: this.dataInicio,
            dataFim: this.dataFim,
            notificacoes: this.notificacoes,
            status: this.status
        };

    }

}
