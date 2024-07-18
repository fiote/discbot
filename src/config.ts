const os = require("os");
const hostname = os.hostname();

export const envconfig = require('dotenv').config({path:__dirname+'/../.env'}).parsed;
export const islocal = hostname == "Fiote-PC";