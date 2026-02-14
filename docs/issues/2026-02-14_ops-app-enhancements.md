
Status: Proposed

# Summary

ops アプリの拡張をする。

---

# Details

- [x] collection page(/kv/['prefix]) での並び順変更
  - 新規が上に来るように並び順をかえたい
- [x] collection page(/kv/['prefix]) での削除モード追加
  - テーブル右上に delete button を追加し、押すことで各リスト上の行頭にチェックボックスが表示される。選択された状態で、再度 delete button を押すと対象のデータを削除できる。整合性などはみなくてよい
- [ ] collection page(/kv/['prefix]) での編集モード追加
  - 行に対し編集ボタンを追加する
  - 編集ボタンを押すとvalue の値を編集でき、submitボタンを押すことでアップデート操作を行うことができる
  - バリデーションなどは行わず、単純な更新作業のみでOK、ただし、各data modelの型に従った内容でなければ更新は受け付けられない
  - id, createdAt, updateAtなどDataModelの定義で基底に設定されている値は更新できない。エラーで返すのでOK
  - ここから更新した場合は updateAt も更新されるのでOK(セオリーに従う。Databaseツール系と異なった仕様であればこの通りではない)
- [ ] collection page(/kv/['prefix]) でのアイテム新規追加
  - value を入力させ、アイテムを追加する
  - 指定可能な値は編集に準ずる。新規のため、フォーム上で id は含めなくてよい
- [ ] collection page(/kv/['prefix]) での追加ロード (優先度低、現段階では見送ってよい)
  - 件数を超えた場合、 Load more ボタンで次の100件(Limit設定に従った数字)を取得、表示上に追加する

# Approach

---

# Results
