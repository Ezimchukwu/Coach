const mongoose = require('mongoose');

// MongoDB Atlas connection URI
const DATABASE_URL = 'mongodb+srv://divinetonyezimchukwu:Divinetonye2000@cluster0.uqhvy.mongodb.net/coaching_membership?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(DATABASE_URL)
    .then(async () => {
        console.log('Connected to MongoDB...');
        
        // Get all collections
        const collections = await mongoose.connection.db.collections();
        
        // Drop each collection
        for (let collection of collections) {
            await collection.drop();
            console.log(`Dropped collection: ${collection.collectionName}`);
        }
        
        console.log('Database cleared successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    }); 