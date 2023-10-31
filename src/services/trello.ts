import clc from "cli-color";
const fetchUrl = require("fetch").fetchUrl;
const config = require('dotenv').config().parsed;

export class Trello {

	apikey: string;
	token: string;

	constructor(apikey?: string, token?: string) {
		this.log('constructor()');
		this.apikey = apikey || config.TRELLO_APIKEY;
		this.token = token || config.TRELLO_TOKEN;
	}

	init() {
		this.log('init()');
		this.addHooks();
	}


	async addHooks() {
		this.log('addHooks()');
		const boards = await this.getBoards();
		for (const board of boards) {
			this.log(board.data.id, board.data.name);
		}

		// adding a generic get route so atlassian can verify the webhook
		process.services.express.app.get('/trelloCallback', async (req, res) => {
			res.send('hi there!');
		});

		// actually adding the webhook
		process.services.express.app.post('/trelloCallback', async (req, res) => {
			this.log('got POST webhook'); //, req.body);
			const { action } = req.body;

			if (action.type == 'updateCard') {
				const { card, listBefore, listAfter } = action.data;
				const { fullName } = action.memberCreator;
				this.log(card);
				process.services.discord.notifyCardMove(card.idShort, fullName, listBefore?.name, listAfter?.name);
			}

			res.json({status: true});
		});

		this.post('webhooks', {
			description: 'Webhook to watch changes on Fiotactics - Unity',
			callbackURL: 'https://discbot.fiotactics.com/trelloCallback',
			idModel: '6093e00f7ec1885cd4759058'
		}).then(data => {
			this.log('post() data', data);
		});
	}

	// ===== REQUESTS ===============================================

	async request(method: string, endpoint: string, data?: any | undefined) {
		this.log('request()', method, endpoint, data);

		let url = `https://api.trello.com/1/${endpoint}?key=${this.apikey}&token=${this.token}`;

		const headers = ['Accept: application/json']
		let body = '';

		let payload = 'query';

		if (payload == 'body') {
			body = JSON.stringify(data);
		}

		if (payload == 'query' && data) {
			Object.keys(data).forEach(key => {
				const value = encodeURIComponent(data[key]);
				url += ['&'+key,'=',value].join('');
				delete data[key];
			});
		}
;
		return new Promise((resolve, reject) => {
			fetchUrl(url, { method, headers, body }, (err: any, meta: any, feed: any) => {
				if (err) {
					reject(err);
					return;
				}
				const text = feed.toString();
				try {
					resolve(JSON.parse(text));
				} catch (e) {
					resolve(text);
				}
			});
		});

	}

	async get(endpoint: string) : Promise<any> {
		this.log('get()', endpoint);
		return this.request('GET', endpoint);
	}

	async post(endpoint: string, data: any) : Promise<any> {
		this.log('post()', endpoint, data);
		return this.request('POST', endpoint, data);
	}

	async put(endpoint: string, data: any) : Promise<any> {
		this.log('put()', endpoint, data);
		return this.request('PUT', endpoint, data);
	}

	// ===== MEMBERS ================================================

	async me() {
		this.log('me()');
		return this.member('me');
	}

	async member(id: string) {
		this.log('member()', id);
		const rawdata = await this.get(`members/`+id);
		return new TrelloMember(rawdata);
	}

	// ===== BOARDS =================================================

	async getBoards() : Promise<TrelloBoard[]> {
		this.log('getBoards()');
		const rawlist = await this.get(`members/me/boards`);
		return rawlist.map((x: any) => new TrelloBoard(x));
	}

	async findBoard(query: string, exact: boolean = true) : Promise<TrelloBoard | undefined> {
		this.log('findBoard()', query, exact);
		const result = await this.getBoards();
		return result.find(x => x.matchSearch(query, exact));
	}

	// ===== LABELS =================================================

	async getLabels(boardid: string) : Promise<TrelloLabel[]> {
		this.log('getLabels()', boardid);
		const rawlist = await this.get(`boards/${boardid}/labels`);
		return rawlist.map((x: any) => new TrelloLabel(x, new TrelloBoard({ id: boardid })));
	}

	// ===== CARDS ==================================================

	async createCard(data: any) : Promise<TrelloCard> {
		this.log('createCard()', data);
		const rawdata = await this.post(`cards`, data);
		const card = new TrelloCard(rawdata);
		await card.prependId();
		return card;
	}

	// ===== LOG ====================================================

	log(...args : any[]) {
		var args2 = Array.from(args);
		args2.unshift(clc.cyan('[Trello]'));
		console.log(...args2);
	}

}

export class TrelloMember {

	data: any;
	id: string;
	avatarUrl: string;

	constructor(data: any) {
		this.data = data;
		this.id = data.id;
		this.avatarUrl = data.avatarUrl;
	}
}

export class TrelloBoard {

	data: any;
	id: string;
	name: string;
	url: string;

	constructor(data: any) {
		this.data = data;
		this.id = data.id;
		this.name = data.name;
		this.url = data.url;
	}

	// DATA

	matchSearch(query: string, exact: boolean = true) : boolean {
		return exact ? (this.name == query || this.id == query) : this.name.toLowerCase().includes(query.toLowerCase());
	}

	// LISTS

	async getLists() : Promise<TrelloList[]> {
		const rawlist = await process.services.trello.get(`boards/${this.id}/lists`);
		return rawlist.map((l: any) => new TrelloList(l, this));
	}

	async findList(query: string, exact: boolean = true) : Promise<TrelloList | undefined> {
		const result = await this.getLists();
		return result.find(x => x.matchSearch(query, exact));
	}

	// CARDS

	async getCards() : Promise<TrelloCard[]> {
		const rawlist = await process.services.trello.get(`boards/${this.id}/cards`);
		rawlist.sort((a: any, b: any) => a.name < b.name ? -1 : 1);
		return rawlist.map((c: any) => new TrelloCard(c, this));
	}

	async findCard(query: string, exact: boolean = true) : Promise<TrelloCard | undefined> {
		const result = await this.getCards();
		return result.find(x => x.matchSearch(query, exact));
	}

	// LABELS

	async getLabels() : Promise<TrelloLabel[]> {
		const rawlist = await process.services.trello.get(`boards/${this.id}/labels`);
		return rawlist.map((l: any) => new TrelloLabel(l, this));
	}

	async findLabel(query: string, exact: boolean = true) : Promise<TrelloLabel | undefined> {
		const result = await this.getLabels();
		return result.find(x => x.matchSearch(query, exact));
	}

}

export class TrelloLabel {
	data: any;
	id: string;
	name: string;
	color: string;
	board: TrelloBoard;

	constructor(data: any, board: TrelloBoard) {
		this.data = data;
		this.id = data.id;
		this.name = data.name;
		this.color = data.color;
		this.board = board;
	}

	// DATA

	matchSearch(query: string, exact: boolean = true) : boolean {
		return exact ? (this.name == query || this.id == query) : this.name.toLowerCase().includes(query.toLowerCase());
	}
}

export class TrelloList {

	data: any;
	id: string;
	name: string;
	url: string;
	board: TrelloBoard;

	constructor(data: any, board: TrelloBoard) {
		this.data = data;
		this.id = data.id;
		this.name = data.name;
		this.url = data.url;
		this.board = board;
	}

	// DATA

	matchSearch(query: string, exact: boolean = true) : boolean {
		return exact ? (this.name == query || this.id == query) : this.name.toLowerCase().includes(query.toLowerCase());
	}
}

export class TrelloCard {

	data: any;
	id: string;
	idShort: number;
	name: string;
	url: string;
	board?: TrelloBoard;

	constructor(data: any, board?: TrelloBoard) {
		this.data = data;
		this.id = data.id;
		this.idShort = data.idShort;
		this.name = data.name;
		this.url = data.url;
		this.board = board;
	}

	// DATA

	matchSearch(query: string, exact: boolean = true) : boolean {
		return exact ? (this.name == query || this.id == query || this.idShort.toString() == query) : this.name.toLowerCase().includes(query.toLowerCase());
	}

	async retrieveBoard() {
		const rawdata = await process.services.trello.get(`cards/${this.id}/board`);
		this.board = new TrelloBoard(rawdata);
		return this.board;
	}

	// NAME

	async prependId() {
		this.name = `${this.idShort} - ${this.name}`;
		return await process.services.trello.put(`cards/${this.id}`, { name: this.name });
	}

	// LIST

	async moveTo(listname: string) {
		if (!this.board) await this.retrieveBoard();
		const list = await this.board?.findList(listname, false);
		if (list) return await process.services.trello.put(`cards/${this.id}`, { idList: list.id });
	}

	// LABEL

	async addLabel(tagname: string) {
		if (!this.board) await this.retrieveBoard();
		const label = await this.board?.findLabel(tagname, false);
		return await process.services.trello.post(`cards/${this.id}/idLabels`, { value: label?.id });
	}
}