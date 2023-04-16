import { Trello } from '@classes/trello';
import Disco from "@classes/disco";
import { ExpressServer } from "@classes/express";

// ===== DECLARE ====================================================

declare global {
 	namespace NodeJS {
		interface Process {
			services: {
				express: ExpressServer;
				discord: Disco;
				trello: Trello;
			}
		}
	}
}

// ===== INIT ========================================================

process.services = {
	express: new ExpressServer(),
	discord: new Disco(),
	trello: new Trello(),
}

process.services.express.init();
process.services.discord.init();
process.services.trello.init();