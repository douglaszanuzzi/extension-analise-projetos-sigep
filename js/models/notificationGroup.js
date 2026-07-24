export class NotificationGroup {

    constructor(data = {}) {

        this.id = data.id ?? "";

        this.cci = data.cci ?? "";

        this.proprietario = data.proprietario ?? "";

        this.dataInicio = data.dataInicio ?? "";

        this.dataFim = data.dataFim ?? "";

        this.primeiraNotificacaoEm =
            data.primeiraNotificacaoEm ?? data.dataInicio ?? "";

        this.ultimaAtualizacaoEm =
            data.ultimaAtualizacaoEm ?? data.dataFim ?? "";

        this.notificacoes = Array.isArray(data.notificacoes)
            ? data.notificacoes
            : [];

        this.status = data.status ?? "NEW";

        this.arquivos = Array.isArray(data.arquivos)
            ? data.arquivos
            : [];

        this.visto = data.visto ?? !data.ehNovo;

        this.vistoEm = data.vistoEm ?? "";

        this.ehNovo = !this.visto;

    }

    toJSON() {

        return {
            id: this.id,
            cci: this.cci,
            proprietario: this.proprietario,
            dataInicio: this.dataInicio,
            dataFim: this.dataFim,
            primeiraNotificacaoEm: this.primeiraNotificacaoEm,
            ultimaAtualizacaoEm: this.ultimaAtualizacaoEm,
            notificacoes: this.notificacoes,
            status: this.status,
            arquivos: this.arquivos,
            visto: this.visto,
            vistoEm: this.vistoEm,
            ehNovo: this.ehNovo
        };

    }

}
