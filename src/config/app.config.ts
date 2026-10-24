import { registerAs } from '@nestjs/config';

// config/app.php 相当
export default registerAs('app', () => ({
  port: Number(process.env.PORT || 3000),
}));
