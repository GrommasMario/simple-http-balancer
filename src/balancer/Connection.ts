import * as http from "http";
import {randomUUID} from "crypto";
import {LoadBalancerServer} from "./LoadBalancerServer";

export class Connection {
    id = randomUUID();

    constructor(
        readonly response: http.ServerResponse,
        readonly from: Pick<LoadBalancerServer, 'id'>
    ) {}
}
