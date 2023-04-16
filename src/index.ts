import Disco from "services/disco";
import { ExpressServer } from "services/express";
import { Trello } from 'services/trello';

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