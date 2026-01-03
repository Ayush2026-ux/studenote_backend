import { Router } from 'express';
import { registerController } from '../../controllers/users/register.controller';
import { login, refreshAccessToken } from '../../controllers/users/login.controller';


const router = Router();

router.post('/register', registerController);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);


export default router;
