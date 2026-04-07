import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        const mongoUri = (process.env.MONGO_URI || process.env.MONGO_DB || "").trim();

        if (!mongoUri) {
            throw new Error("MongoDB connection string is missing. Set MONGO_URI or MONGO_DB.");
        }

        mongoose.connection.on("connected", () => console.log("mongodb connection successfuly!"))
        const parsedUri = new URL(mongoUri);
        const databaseNameFromUri = parsedUri.pathname?.replace(/^\//, "");
        const fallbackDatabaseName = (process.env.MONGO_DB_NAME || "chat-app").trim();
        const connectionOptions = databaseNameFromUri
            ? {}
            : { dbName: fallbackDatabaseName };

        await mongoose.connect(mongoUri, connectionOptions)
    } catch (error) {
        console.log(error);
        throw error;
    }
}
export default connectDB
