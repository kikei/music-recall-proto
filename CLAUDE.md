# music-recall プロジェクト方針

音楽想起エンジンのプロトタイプ。概要は [README.md](./README.md)、設計思想は
[CONCEPT.md](./CONCEPT.md) を参照。グローバルの方針に加えて以下に従う。

## 言語の使い分け (重要)

- ソースコードのコメント: **英語**
- コミットメッセージ: **英語**
- UI 文字列・LLM プロンプト・ユーザー向けエラーメッセージ: **日本語のまま**
  - 挙動・体験の一部なので英訳しない。ドキュメントの英語化に引きずられて
    日本語の UI 文言を翻訳しないこと。

## スタック

- フロント: Vite + React 19 (`src/`)。`screens/` に 3 画面、`api/` がクライアント。
- バックエンド: Hono + @hono/node-server (`server/`)。`db/` データ層、
  `llm/` OpenAI 連携、`cards/` 想起とカード生成、`player/` プレイヤー解決、
  `routes/` エンドポイント。
- 保存: better-sqlite3。DB は `data/music-recall.sqlite` (`DB_PATH` で上書き可)。

## プレイヤー解決

- LLM は使わない。Spotify / YouTube は各 Search API、ニコニコ動画は公開の
  getthumbinfo API で解決する。
- セッション開始時に URL を貼ればそのまま埋め込むため、API キーなしで動く。
  ニコニコもキー不要。Spotify / YouTube のキーは「URL 未指定時の自動解決」に
  だけ使う。詳細は [docs/player-api-keys.txt](./docs/player-api-keys.txt)。

## 開発と検証

- 起動: `npm run dev` (バックエンド :8787 とフロント :5173 を同時起動)。
- 整形: `npm run format` (Prettier)。
- テストスイートは無い。変更後は `npx tsc --noEmit` と `npx vite build` で
  型と本番ビルドを確認する。
- better-sqlite3 はネイティブビルドを伴うため、`npm install` にはビルド環境が
  必要。

## Git

- `git add .` は使わずファイル個別に指定する (グローバル方針どおり)。
