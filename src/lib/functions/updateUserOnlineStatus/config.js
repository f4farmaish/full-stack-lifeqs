"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.databases = void 0;
const node_appwrite_1 = require("node-appwrite");
const client = new node_appwrite_1.Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('68a20648002399351e84');
exports.databases = new node_appwrite_1.Databases(client);
exports.config = {
    databaseId: '68a206680030fefd326d',
    userCollectionId: '68a206f4002165b45e19'
};
