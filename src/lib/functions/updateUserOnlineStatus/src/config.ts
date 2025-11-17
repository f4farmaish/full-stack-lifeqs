import { Client, Databases } from "node-appwrite";

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('68a20648002399351e84');

export const databases = new Databases(client);

export const config = {
  databaseId: '68a206680030fefd326d',
  userCollectionId: '68a206f4002165b45e19'
};