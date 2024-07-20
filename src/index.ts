import Disco from "services/disco";
import { ExpressServer } from "services/express";
import { Trello } from 'services/trello';


const express = new ExpressServer();
const discord = new Disco();
const trello = new Trello();

express.init();
discord.init();
trello.init();