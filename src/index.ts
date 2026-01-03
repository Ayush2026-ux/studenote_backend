import dotenv from 'dotenv';
import app from './app';
import connectToMongo from './config/mongodb';

dotenv.config();

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

