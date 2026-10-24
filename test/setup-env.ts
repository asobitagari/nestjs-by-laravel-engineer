// phpunit.xml の <env> に当たる。アプリより先に読み込まれる
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = ':memory:';
process.env.BCRYPT_ROUNDS = '4';
