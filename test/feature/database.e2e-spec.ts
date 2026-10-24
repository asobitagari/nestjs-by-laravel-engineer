import Database from 'better-sqlite3';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// npm run db:* と dist/main.js を実際に起動して確かめる（artisan migrate / db:seed を叩くのと同じ）
const ROOT = resolve(import.meta.dirname, '../..');
const MAIN = join(ROOT, 'dist/main.js');

describe('データベースの CLI と起動時の設定', { timeout: 60_000 }, () => {
  let dir: string;
  let dbFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'nest-db-'));
    dbFile = join(dir, 'test.db');
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // DATABASE_URL だけを差し替えて npm script を流し、終了コードを返す
  function npm(script: string): number {
    const result = spawnSync('npm', ['run', '--silent', script], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: dbFile },
      encoding: 'utf8',
    });
    if (result.status !== 0) console.error(result.stdout, result.stderr);
    return result.status ?? -1;
  }

  function db() {
    const connection = new Database(dbFile);
    // アプリの接続（TypeORM の better-sqlite3 ドライバ）と同じく外部キーを有効にする
    connection.pragma('foreign_keys = ON');
    return connection;
  }

  function tables(): string[] {
    const connection = db();
    const rows = connection
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'migrations' ORDER BY name",
      )
      .all() as { name: string }[];
    connection.close();
    return rows.map((row) => row.name);
  }

  function columns(table: string): string[] {
    const connection = db();
    const rows = connection.pragma(`table_info(${table})`) as {
      name: string;
    }[];
    connection.close();
    return rows.map((row) => row.name);
  }

  function count(table: string): number {
    const connection = db();
    const row = connection
      .prepare(`SELECT COUNT(*) AS c FROM ${table}`)
      .get() as { c: number };
    connection.close();
    return row.c;
  }

  function counts() {
    return {
      users: count('users'),
      authors: count('authors'),
      books: count('books'),
    };
  }

  const ALL_TABLES = ['authors', 'books', 'refresh_tokens', 'users'];
  const SEEDED = { users: 2, authors: 3, books: 5 };

  describe('マイグレーション', () => {
    it('空の DB → 終了コード 0・4 テーブル', () => {
      expect(npm('db:migrate')).toBe(0);

      expect(tables()).toEqual(ALL_TABLES);
    });

    it('2 回実行 → 2 回目も 0・テーブルとデータは変わらない', () => {
      npm('db:migrate');
      const connection = db();
      connection
        .prepare("INSERT INTO authors (name) VALUES ('夏目漱石')")
        .run();
      connection.close();

      expect(npm('db:migrate')).toBe(0);

      expect(tables()).toEqual(ALL_TABLES);
      expect(count('authors')).toBe(1);
    });
  });

  describe('日時と論理削除のカラム', () => {
    beforeEach(() => {
      npm('db:migrate');
    });

    it('authors のカラム', () => {
      expect(columns('authors')).toEqual([
        'id',
        'name',
        'email',
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
    });

    it('refresh_tokens のカラム（deleted_at はない）', () => {
      expect(columns('refresh_tokens')).toEqual([
        'id',
        'user_id',
        'token',
        'expires_at',
        'created_at',
      ]);
    });
  });

  describe('データ整合性の制約', () => {
    beforeEach(() => {
      npm('db:migrate');
    });

    it('同じ email のユーザー 2 件 → 一意制約違反', () => {
      const connection = db();
      const insert = connection.prepare(
        "INSERT INTO users (name, email, password) VALUES ('a', 'dup@example.com', 'x')",
      );
      insert.run();

      expect(() => insert.run()).toThrow(
        expect.objectContaining({ code: 'SQLITE_CONSTRAINT_UNIQUE' }),
      );
      connection.close();
    });

    it('存在しない著者の書籍 → 外部キー制約違反', () => {
      const connection = db();

      expect(() =>
        connection
          .prepare(
            "INSERT INTO books (title, author_id, price) VALUES ('x', 9999, 1)",
          )
          .run(),
      ).toThrow(
        expect.objectContaining({ code: 'SQLITE_CONSTRAINT_FOREIGNKEY' }),
      );
      connection.close();
    });
  });

  describe('ロールバック', () => {
    beforeEach(() => {
      npm('db:migrate');
    });

    it('1 回ロールバック → refresh_tokens だけ消える', () => {
      expect(npm('db:rollback')).toBe(0);

      expect(tables()).toEqual(['authors', 'books', 'users']);
    });

    it('ロールバック後に再適用 → refresh_tokens が戻る', () => {
      npm('db:rollback');

      expect(npm('db:migrate')).toBe(0);

      expect(tables()).toEqual(ALL_TABLES);
    });
  });

  describe('冪等なシーダー', () => {
    beforeEach(() => {
      npm('db:migrate');
    });

    it('1 回実行 → users 2・authors 3・books 5', () => {
      expect(npm('db:seed')).toBe(0);

      expect(counts()).toEqual(SEEDED);
    });

    it('2 回実行 → 件数は変わらない', () => {
      npm('db:seed');

      expect(npm('db:seed')).toBe(0);

      expect(counts()).toEqual(SEEDED);
    });

    it('シードユーザーでログイン → GET /api/profile の isAdmin が true', async () => {
      npm('db:seed');
      const port = await freePort();
      const app = await startApp({
        JWT_SECRET: 'seed-test',
        DATABASE_URL: dbFile,
        PORT: String(port),
      });

      try {
        const base = `http://localhost:${port}/api`;
        const login = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@example.com',
            password: 'password',
          }),
        });
        expect(login.status).toBe(200);
        const { accessToken } = (await login.json()) as { accessToken: string };

        const profile = await fetch(`${base}/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        expect(((await profile.json()) as { isAdmin: boolean }).isAdmin).toBe(
          true,
        );
      } finally {
        await app.stop();
      }
    });
  });

  describe('作り直し', () => {
    it('データを足した後の fresh → authors 3 件に戻る', () => {
      npm('db:migrate');
      npm('db:seed');
      const connection = db();
      connection.prepare("INSERT INTO authors (name) VALUES ('追加')").run();
      connection.close();

      expect(npm('db:fresh')).toBe(0);

      expect(count('authors')).toBe(3);
    });

    it('DB ファイルがない状態の fresh → 0・シード直後と同じ', () => {
      expect(existsSync(dbFile)).toBe(false);

      expect(npm('db:fresh')).toBe(0);

      expect(counts()).toEqual(SEEDED);
    });
  });

  describe('必須設定の検証', () => {
    beforeAll(() => {
      expect(
        spawnSync('npm', ['run', '--silent', 'build'], { cwd: ROOT }).status,
      ).toBe(0);
    });

    it('JWT_SECRET なし → JWT_SECRET を含むエラーで止まる', () => {
      const result = spawnSync('node', [MAIN], {
        cwd: dir, // .env を読まないよう、空のディレクトリで起動する
        env: baseEnv({ DATABASE_URL: dbFile }),
        encoding: 'utf8',
        timeout: 30_000,
      });

      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('JWT_SECRET');
    });

    it('JWT_SECRET だけ → ポート 3000 で起動し sqlite.db を使う', async () => {
      const app = await startApp({ JWT_SECRET: 'defaults-test' });

      try {
        const res = await fetch('http://localhost:3000/api/books');

        expect(res.status).toBe(200);
        expect(existsSync(join(dir, 'sqlite.db'))).toBe(true);
      } finally {
        await app.stop();
      }
    });
  });

  // テスト用の値（setup-env.ts）を外し、渡したものだけを環境変数にする
  function baseEnv(env: Record<string, string>): NodeJS.ProcessEnv {
    const { JWT_SECRET: _s, DATABASE_URL: _d, PORT: _p, ...rest } = process.env;
    return { ...rest, ...env };
  }

  // dist/main.js を一時ディレクトリで起動し、ポートに繋がるまで待つ
  async function startApp(
    env: Record<string, string>,
  ): Promise<{ stop: () => Promise<void> }> {
    const port = Number(env.PORT ?? 3000);
    const child = spawn('node', [MAIN], { cwd: dir, env: baseEnv(env) });
    let output = '';
    let exited = false;
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('exit', () => (exited = true));

    for (let i = 0; !(await canConnect(port)); i++) {
      if (exited || i > 100) throw new Error(`app did not start:\n${output}`);
      await new Promise((r) => setTimeout(r, 100));
    }
    return {
      stop: () =>
        new Promise((resolveStop) => {
          child.removeAllListeners('exit');
          child.on('exit', () => resolveStop());
          child.kill();
        }),
    };
  }
});

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolveConnect) => {
    const socket = connect(port, 'localhost');
    socket.once('connect', () => {
      socket.end();
      resolveConnect(true);
    });
    socket.once('error', () => resolveConnect(false));
  });
}

function freePort(): Promise<number> {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolvePort(port));
    });
  });
}
