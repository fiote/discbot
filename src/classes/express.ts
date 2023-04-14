import express, { Express } from "express";
import compression from "compression";
import cors from "cors";
import { envconfig } from "config";
import clc from "cli-color";
import disco from "./disco";

export class ExpressServer {

	app: Express;
	port = 2588;

	constructor() {
		this.log('constructor()');
		this.app = express();

		this.app.use(compression({
			threshold: 0,
			filter: function () { return true; }
		}));

		this.app.use(cors());
		this.app.use(express.json());
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