# 4コマメイカー

AIで4コマ漫画を簡単に作成できるWebアプリケーション

## 機能

- プロジェクト管理
- キャラクター作成（AI生成・手動作成）
- エピソード作成
- 4コマ漫画の自動生成
- コミックの編集・ダウンロード

## 使い方

1. 設定画面でGoogle Gemini APIキーを入力
2. プロジェクトを作成
3. キャラクターを作成
4. エピソードを作成して4コマ漫画を生成

## 技術スタック

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Google Generative AI (Gemini)
- IndexedDB

## デプロイ

このアプリは完全にクライアントサイドで動作します。
APIキーはユーザーのブラウザ（IndexedDB）にのみ保存され、サーバーには送信されません。

## ローカル開発

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセス
