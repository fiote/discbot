import Disco from "@classes/disco";
import { ExpressServer } from "@classes/express";

const expserver = new ExpressServer();
expserver.init();

const disco = new Disco();
disco.init();
disco.addRoutes(expserver);