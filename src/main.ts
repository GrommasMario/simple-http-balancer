import {LoadBalancerManager} from "./balancer/LoadBalancerManager";
import {Instance} from "./balancer/Instance";
import * as fs from 'fs'
import * as path from "path";

function main(){
    const configExist = fs.existsSync(path.join(__dirname, '../config.json'))

    if(!configExist){
        throw new Error('Config not found')
    }

    const config = require('../config.json');

    if(config){
        const loadBalancerManager = new LoadBalancerManager()

        config.loadBalancers.forEach(loadBalancer => {
            const {instances, ...balancerConfig} = loadBalancer;
            const loadBalancerId = loadBalancerManager.add(balancerConfig, []);
            instances.map(instanceConfig => loadBalancerManager.get(loadBalancerId).attachInstance(new Instance(instanceConfig)))
            loadBalancerManager.start(loadBalancerId).catch();
        })
    }
}

main();
