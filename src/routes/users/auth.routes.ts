import { Router } from 'express';
import { registerController } from '../../controllers/users/register.controller';
import { login, refreshAccessToken } from '../../controllers/users/login.controller';
import { protect } from '../../middlewares/logout.middlewere';
import { logout } from '../../controllers/users/logout.controller';


const router = Router();

// Auth Routes 
router.post('/register', registerController);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);

// Protected route for logout
router.post('/logout', protect, logout);



export default router;
