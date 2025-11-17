import { databases, config } from './config';
import { Query } from 'node-appwrite';

export default async ({ req, res, log, error }: any) => {
  try {
    log('Vérification des utilisateurs inactifs...');
    
    const threshold = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes

    const { documents: users } = await databases.listDocuments(
      config.databaseId,
      config.userCollectionId,
      [
        Query.equal('isOnline', true),
        Query.lessThanEqual('lastActive', threshold),
        Query.limit(100)
      ]
    );

    if (users.length === 0) {
      return res.json({ message: 'Aucun utilisateur inactif trouvé' });
    }

    await Promise.all(
      users.map(user => 
        databases.updateDocument(
          config.databaseId,
          config.userCollectionId,
          user.$id,
          { isOnline: false }
        )
      )
    );

    return res.json({
      success: true,
      users_updated: users.length
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    error(errorMessage);
    return res.json({ success: false, error: errorMessage }, 500);
  }
};