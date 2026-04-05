import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGO_DB;

        if (!mongoUri) {
            throw new Error("MongoDB connection string is missing. Set MONGO_URI or MONGO_DB.");
        }

        mongoose.connection.on("connected", () => console.log("mongodb connection successfuly!"))
        const databaseUri = mongoUri.endsWith("/chat-app") ? mongoUri : `${mongoUri}/chat-app`;
        await mongoose.connect(databaseUri)
    } catch (error) {
        console.log(error);
        throw error;
    }
}
export default connectDB
