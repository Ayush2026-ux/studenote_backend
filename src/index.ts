import dotenv from 'dotenv';
import app from './app';
import connectToMongo from './config/mongodb';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// console.log("JWT_ACCESS_SECRET =", process.env.JWT_ACCESS_SECRET);
// console.log("JWT_REFRESH_SECRET =", process.env.JWT_REFRESH_SECRET);


const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

connectToMongo();


process.on('SIGTERM', () => {
    console.log(' SIGTERM received. Shutting down...');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log(' SIGINT received. Shutting down...');
    server.close(() => process.exit(0));
});

