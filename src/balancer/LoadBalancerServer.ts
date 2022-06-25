import * as http from "http";
import {ILoadBalancerServerOptions} from "./interfaces/ILoadBalancerServerOptions";
import {Instance} from "./Instance";
import * as httpProxy from "http-proxy";
import {randomUUID} from "crypto";
import {defaultLoadBalancerServerOptions} from "./DefaultLoadBalancerServerOptions";
import {Connection} from "./Connection";
import {IAbortRequestParam} from "./interfaces/IAbortRequestParam";
import {IBalancerStatus} from "./interfaces/IBalancerStatus";

function abortRequest(res: IAbortRequestParam){
    if(res.statusCode){
        res.statusCode = 503;
    }
    res.end();
}

export class LoadBalancerServer {
    readonly id = randomUUID();

    private _options: Required<ILoadBalancerServerOptions> = defaultLoadBalancerServerOptions;
    get options(){
        return this._options;
    }
    set options(options: ILoadBalancerServerOptions){
        this._options = {...this._options, ...options};
    }

    private proxyServer: httpProxy;
    private server: http.Server;
    protected availableServers: Map<string, Instance> = new Map()
    private quanta = 0;

    constructor(
        protected readonly instances: Instance[]
    ) {
        this.proxyServer = httpProxy.createProxyServer({ws: true})
        this.server = http.createServer();
        instances.map(instance => {
            this.setAvailableServers(instance)
        })
    }

    private _status: IBalancerStatus = IBalancerStatus.STOPPED;
    get status(){
        return this._status;
    }

    getInstances(){
        return Array.from(this.availableServers.values());
    }

    attachInstance(instance: Instance){
        this.setAvailableServers(instance);
        instance.events.on('switchActive', ([instanceSwitch, newActive]) => {
            if(newActive){
                this.setAvailableServers(instanceSwitch);
            } else {
                this.setUnAvailableServers(instanceSwitch.id);
            }
        });
    }

    detachInstance(id: string){
        const instance = this.availableServers.get(id);
        if(instance){
            instance.destroyConnectionsByBalancer(this.id)
            this.availableServers.delete(id);
        }
    }

    async stop(){
        console.info('LoadBalancerServer server stopping...')

        this._status = IBalancerStatus.STOPPING;
        this.server.removeAllListeners('request')

        for (const [,instance] of this.availableServers){
            instance.destroyConnectionsByBalancer(this.id);
        }
        await this.server.close();
        this._status = IBalancerStatus.STOPPED;

        console.info('LoadBalancerServer server stopped!')
    }

    async bootstrap() {
        if(this._status !== IBalancerStatus.STOPPED){
            throw new Error(`Server status - ${this._status}`);
        }

        this.server.on('request', (req, res) => {
            if(this.status !== IBalancerStatus.ACTIVE){
                abortRequest(res);
                return;
            }

            const instance = this.nextInstance();
            if(!instance){
                abortRequest(res);
                return;
            }

            instance.addConnection(new Connection(res, this));
            this.proxyServer.web(req, res, {target: instance.url, ws: true}, (err, req, res) => {
                instance.active = false;
                abortRequest(res);
            })
        })

        this.server = await this.server.listen(this._options.port);
        this._status = IBalancerStatus.ACTIVE;
    }

    nextInstance(){
        this.quanta += 1;

        if(this.availableServers.size < this.quanta + 1){
            this.quanta = 0;
        }

        return Array.from(this.availableServers.values())[this.quanta];
    }

    protected setAvailableServers(instance: Instance){
        this.availableServers.set(instance.id, instance);
    }
    protected setUnAvailableServers(id: string){
        this.availableServers.delete(id);
    }

    // private roundByConnectionCount():Instance | null {
    //     let server: Instance | null = null;
    //     let connections = 0;
    //
    //     for (const [,instance] of this.availableServers){
    //         if(instance.connectionsCount < connections || !server){
    //             server = instance;
    //             connections = instance.connectionsCount;
    //         }
    //     }
    //
    //     return server;
    // }
}
