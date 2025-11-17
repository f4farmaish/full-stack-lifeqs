"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const node_appwrite_1 = require("node-appwrite");
exports.default = async ({ req, res, log, error }) => {
    try {
        log('Vérification des utilisateurs inactifs...');
        const threshold = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes
        const { documents: users } = await config_1.databases.listDocuments(config_1.config.databaseId, config_1.config.userCollectionId, [
            node_appwrite_1.Query.equal('isOnline', true),
            node_appwrite_1.Query.lessThanEqual('lastActive', threshold),
            node_appwrite_1.Query.limit(100)
        ]);
        if (users.length === 0) {
            return res.json({ message: 'Aucun utilisateur inactif trouvé' });
        }
        await Promise.all(users.map(user => config_1.databases.updateDocument(config_1.config.databaseId, config_1.config.userCollectionId, user.$id, { isOnline: false })));
        return res.json({
            success: true,
            users_updated: users.length
        });
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        error(errorMessage);
        return res.json({ success: false, error: errorMessage }, 500);
    }
};
