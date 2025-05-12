import mongoose from "mongoose";

const DBConnect = async () => {
    try {
        // Using the MONGODB_URI directly without appending DB_NAME
        // as the database name should already be part of the URI
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`\n MongoDB connected successfully \n${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB connection error ", error);
        process.exit(1);
    }
};

export default DBConnect;