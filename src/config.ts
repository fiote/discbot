export const masterConfig = {
	welcome: true,
	chests: true,
	claim: true
};


export const envconfig = require('dotenv').config({path:__dirname+'/../.env'}).parsed;