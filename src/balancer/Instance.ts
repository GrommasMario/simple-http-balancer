import {randomUUID} from "crypto";
import {Url} from "./Url";
import * as EventEmitter from "events";
import {Connection} from "./Connection";
import {IInstanceInitial} from "./interfaces/IInstanceInitial";
import { RequestInfo, RequestInit } from 'node-fetch';

const fetch = (url: RequestInfo, init?: RequestInit) =>
    import('node-fetch').then(({ default: fetch }) => fetch(url, init));

export class Instance {
    id = randomUUID();
    host: string;
    port: number | null;

    private _active: boolean | null = null;
    get active(){
        return this._active;
    }
    set active(active){
        this.switchActive(active);
    }

    readonly url: string;
    readonly checkUrl: string;
    private _connections: Map<string, Connection> = new Map();
    readonly events = new EventEmitter();

    private checkTiming = 10000;
    private checkTimingInterval = setInterval(() => this.check(), this.checkTiming)

    constructor(init: IInstanceInitial) {
        this.host = init.host;
        this.port = init.port ?? null;
        this.url = new Url(this.host, this.port).http
        this.checkUrl = new Url(this.host, this.port, [init.checkUrl]).http
        this.check();
    }

    addConnection(connection: Connection){
        if(!this._active){
            return;
        }

        const id = randomUUID();
        this._connections.set(id, connection);
        this.events.emit('connectionUp');
        connection.response.on('close', () => this.destroyConnection(id));
        connection.response.on('error', () => this.destroyConnection(id));
    }

    destroyConnectionsByBalancer(id: string){
        for (const [,connection] of this._connections){
            if(connection.from.id === id){
                this.destroyConnection(connection.id);
            }
        }
    }

    destroyConnection(id: string){
        const connection = this._connections.get(id)
        if(connection){
            if(!connection.response.destroyed){
                connection.response.destroy();
            }

            this._connections.delete(id);

            if(this._active){
                this.events.emit('connectionDown');
            }

            this.checkEmpty();
        }
    }

    onEmpty(cb: () => void): void | EventEmitter{
        if(this.connectionsCount === 0){
            cb();
            return;
        } else {
            return this.events.on('empty', () => (cb()))
        }
    }

    get connectionsCount(){
        return this._connections.size;
    }

    private check(){
        fetch(this.checkUrl, )
            .then((r) => {
                if(r.ok){
                    this.switchActive(true);
                }
            })
            .catch(() => {
                this.switchActive(false);
                console.warn(`Instance (${this.id}) | host := ${this.host} | port := ${this.port} | active := ${this._active} `);
            })

    }

    private checkEmpty(){
        if(this.connectionsCount === 0){
            this.events.emit('empty', this.id);
        }
    }

    private switchActive(target: boolean){
        if(target !== this._active){
            console.info(`Instance (${this.id})\n   Change active from (${this._active}) to (${target}) `)
            this._active = target;
            this.events.emit('switchActive', [this, this._active]);
        }
    }
}
