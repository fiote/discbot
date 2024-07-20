import clc from "cli-color";
import compression from "compression";
import { envconfig } from "config";
import cors from "cors";
import express, { Express } from "express";

export const EXPRESS = () => {
	return ExpressServer.instance;
}

export class ExpressServer {

	app: Express;
	port = 2588;

	static instance : ExpressServer;

	constructor() {
		this.log('constructor()');
		this.app = express();

		this.app.use(compression({
			threshold: 0,
			filter: function () { return true; }
		}));

		this.app.use(cors());
		this.app.use(express.json());

		ExpressServer.instance = this;
	}

	init() : Promise<void> {
		this.log('init()');
		const port = envconfig.EXPRESS_PORT;
		return new Promise(resolve => {
			this.app.listen(port, () => {
				this.log(`listening on port [${port}]. Welcome!`);
				resolve();
			});
		});
	}

	// ===== LOG ====================================================

	log(...args : any[]) {
		var args2 = Array.from(args);
		args2.unshift(clc.green('[Express]'));
		console.log(...args2);
	}
}