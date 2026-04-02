Status: Planned

# Summary

`packages/ui` に基礎的なフォーム系 UI コンポーネントを追加する。

---

# Details

以下のコンポーネントを新規追加する。各コンポーネントは showcase ページも合わせて作成する。

- [ ] `Label` — フォームのラベル。`htmlFor` で input と紐付ける
- [ ] `Input` — テキスト入力。`NumberInput` と対になる基本入力
- [ ] `Checkbox` — チェックボックス
- [ ] `Radio` / `RadioGroup` — ラジオボタン。単体の `Radio` とグループ管理用の `RadioGroup` をセットで実装
- [ ] `Select` — セレクトボックス
- [ ] `FormField` — label + input + エラーメッセージをまとめるラッパーコンポーネント
- [ ] `Toast` — 一時的な通知。画面端に表示され自動で消える
- [ ] `Modal` — バックドロップありのオーバーレイ。操作をブロックする。フォームや確認画面向き
- [ ] `Dialog` — `Modal` より軽量なオーバーレイ。簡単な確認・アラート用途
- [ ] `Spinner` — ローディング状態を表すアニメーション。`Button` の `loading` でも内部利用する
- [ ] `Tooltip` — ホバー時の補足説明
- [ ] `Badge` — ステータスや件数を示すラベル
- [ ] `Tag` — カテゴリや属性を示すラベル

以下は検討の余地あり：

- [ ] `Card` — すでに各所で手書きしているレイアウト。共通化候補
- [ ] `Avatar` — ユーザー・子供のプロフィールアイコン枠
- [ ] `Tabs` — 複数ビューの切り替え

# Approach

- 各コンポーネントは既存の `Button` / `NumberInput` と同様のスタイル規約に従う
  - `twMerge` で `class` の上書きを受け付ける
  - `const` + アロー関数で定義
- `FormField` は子コンポーネントとして任意の input 系を受け取り、label と error message を付与する構造にする
- 各コンポーネントに対応する `packages/ui/examples/` と `apps/ops/routes/showcases/` を作成する
- `Button` に `loading?: boolean` prop を追加する（`variant` ではなく状態として扱う）
  - `loading={true}` のとき spinner を絶対配置でテキストの上にオーバーレイ表示する
  - テキストは `invisible` で残しレイアウト崩れを防ぐ
  - 内部的に `disabled` 扱いにしユーザー操作を受け付けない
  - `variant` と直交するため `<Button variant='primary' loading>` のように組み合わせ可能

---

# Results

# References

# Feedback
