import {Instance} from "./Instance";
import {ILoadBalancerServerOptions, ILoadBalancerServerOptionsInitial} from "./interfaces/ILoadBalancerServerOptions";
import {LoadBalancerServer} from "./LoadBalancerServer";

export class LoadBalancerManager {
    private loadBalancers: Map<string, LoadBalancerServer> = new Map();

    add(options: ILoadBalancerServerOptionsInitial & ILoadBalancerServerOptions, instances: Instance[]): string {
        const loadBalancer = new LoadBalancerServer(instances);
        loadBalancer.options = options;

        this.loadBalancers.set(loadBalancer.id, loadBalancer);

        return loadBalancer.id;
    }

    getAll(){
        return Array.from(this.loadBalancers.values())
    }

    get(id: string){
        return this.loadBalancers.get(id);
    }

    async start(id: string){
        const loadBalancer = this.loadBalancers.get(id);
        if(loadBalancer){
            await loadBalancer.bootstrap().catch(e => {
                this.delete(loadBalancer.id);
                console.error(e)
            });
        }
    }

    async stop(id: string){
        const loadBalancer = this.loadBalancers.get(id)
        if(loadBalancer){
            await loadBalancer.stop();
        }
    }

    async stopAll(){
        for (const [, loadBalancer] of this.loadBalancers){
            await loadBalancer.stop();
        }
    }

    async delete(id: string){
        await this.stop(id);
        this.loadBalancers.delete(id);
    }
}
