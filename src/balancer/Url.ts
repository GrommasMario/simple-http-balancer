export class Url {

    constructor(
        protected readonly host: string,
        protected readonly port: number | null | undefined = null,
        protected readonly path: string[] = [],
        protected readonly query: Record<string, string | number | boolean> = {}
    ) {}

    private get queryAdapted(){
        let str = '';

        Object.keys(this.query).forEach(q => {
            str = `${str}${q}=${this.query[q]}&`
        })

        if(str.length > 0){
            str = `?${str}`
        }

        return str;
    }

    private get portAdapted(){
        if(this.port !== null && this.port !== undefined){
            return `:${this.port}`
        }

        return '';
    }

    private get pathAdapted(){
        if(this.path.length > 0){
            return `/${this.path.map(p => p.trim()).join('/')}`
        }

        return ''
    }

    private get joinedPath(){
        return `${this.host}${this.portAdapted}${this.pathAdapted}${this.queryAdapted}`
    }

    get http(){
        return `http://${this.joinedPath}`
    }

    get https(){
        return `https://${this.joinedPath}`
    }
}
