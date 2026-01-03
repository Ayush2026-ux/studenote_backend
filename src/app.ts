import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/users/auth.routes';
const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

// Morgan logger (DEV)
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

app.get('/', (_req, res) => {
    res.json({ message: 'API running 🚀' });
});

export default app;
