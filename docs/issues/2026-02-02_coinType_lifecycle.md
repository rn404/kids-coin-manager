CoinType を削除したとき、残った TimeSession や DailySummary など履歴からコインの情報が消えてしまう
これをどう解決するか
なお、すでにCoinTypeにある active は、もとは配布を止めるためのポーズ機能のために存在しているフィールドである

---

## 調査内容

### 影響範囲の詳細

ER図（docs/whats.md:27-137）から、CoinTypeは以下のエンティティと関連している：

1. **Coin** (`CoinType ||--o{ Coin`)
   - ユーザーが現在保有しているコインの種類を定義
   - `coinTypeId` で参照
   - 影響: CoinType削除後、コインの名前や時間設定が取得不可

2. **CoinTransaction** (`CoinType ||--o{ CoinTransaction`)
   - 取引履歴（daily_distribution/use/exchange/stamp_reward）
   - `coinTypeId` で参照
   - 影響: 過去の取引記録からコイン種類の情報が失われる

3. **UserDailySummary** (`CoinType ||--o{ UserDailySummary`)
   - 日次集計データ（使用したコイン数や時間）
   - `coinTypeId` で参照
   - 影響: 集計データからどのコイン種類だったか不明になる

4. **TimeSession** (`CoinType ||--o{ TimeSession`)
   - 時間の残高履歴を管理（複数レコード存在可能）
   - `coinTypeId` で参照
   - 影響: 残高履歴からコイン種類の情報が取得不可

5. **ActiveTimer** (`CoinType ||--o| ActiveTimer`)
   - 実行中のタイマーを管理（userId + coinTypeId で1レコードのみ）
   - `coinTypeId` で参照
   - 影響: 実行中タイマーの種類情報が不明になる

6. **ExchangeRate** (`CoinType ||--o{ ExchangeRate`)
   - コイン交換レート（from/to両方で参照）
   - `fromCoinTypeId`, `toCoinTypeId` で参照
   - 影響: 交換レート設定が無効になる

7. **StampType** (`CoinType ||--o{ StampType`)
   - お手伝いパスポートの報酬コイン種類
   - `rewardCoinTypeId` で参照
   - 影響: スタンプ報酬の種類が不明になる

### 現状の設計意図

- `active` フィールド: 配布を一時停止するためのポーズ機能
  - `active: false` = 新規配布停止、既存コインは使用可能
  - UI上は選択肢として表示するかどうかの制御に使用される想定

### ユースケースからの考察

MVP要件（docs/whats.md:172-187）:

- CoinType を追加する
- CoinType を編集する
- **削除機能は明示的に記載されていない**

将来的な要件（docs/whats.md:24-25）:

- 管理アカウントでコインの種類とコインの交換レート、設定時間を定義可能にする
- 管理者による柔軟な設定変更が想定されている

### 対策案の比較

#### 案1: 論理削除（Soft Delete）⭐推奨

**実装**:

```typescript
type CoinTypeDataModel = DataModel<{
  familyId: string
  name: string
  durationMinutes: number
  dailyDistribution: number
  active: boolean // 配布の一時停止用（既存）
  deleted: boolean // 削除フラグ（新規）
  deletedAt?: string
}>
```

**メリット**:

- すべての履歴データの整合性が保たれる
- 削除の取り消し（復元）が可能
- 過去のデータ分析・監査ログとして利用可能
- `active` との使い分けが明確
  - `active: false` = 配布停止（再開可能）
  - `deleted: true` = 削除済み（UI非表示、管理者のみ復元可能）

**デメリット**:

- データが物理的に削除されないため、ストレージ容量が増える
- 一覧取得時に `deleted === false` のフィルタリングが必要
- インデックスやクエリが若干複雑になる

**変更箇所**:

- `CoinTypeUseCase.deleteById`: 論理削除に変更
- `CoinTypeUseCase.listAllByFamily`: `deleted === false` フィルタ追加
- `CoinTypeUseCase.getById`: 削除済みの扱いを定義

#### 案2: スナップショット方式

**実装**: 関連エンティティ作成時にCoinTypeの情報をコピー

**メリット**:

- CoinTypeを物理削除しても影響なし
- その時点の情報が正確に記録される
- 後からCoinTypeが変更されても履歴に影響しない

**デメリット**:

- データ重複が大量に発生
- スキーマ変更の影響範囲が広い
- 既存データのマイグレーションが困難
- CoinTypeの情報更新が履歴に反映されない（バグ修正時など）

#### 案3: アーカイブテーブル方式

**実装**: 削除時に別キープレフィックスに移動

```
Active:   ['coinTypes', familyId, id]
Archive:  ['coinTypesArchive', familyId, id]
```

**メリット**:

- アクティブデータと削除済みデータが明確に分離
- 一覧取得のパフォーマンスが向上

**デメリット**:

- 履歴参照時にアーカイブも検索する必要がある
- 削除処理が複雑（atomic操作での移動）
- 論理削除とほぼ同等の効果で実装が複雑

#### 案4: 削除不可（無効化のみ）

**実装**: 削除機能を提供せず、`active: false` での無効化のみ

**メリット**:

- 実装が最もシンプル
- データ整合性が完全に保たれる

**デメリット**:

- 誤って作成したデータも残り続ける
- テストデータの削除ができない
- ユーザー体験が悪い（削除したいケースに対応できない）

#### 案5: ArchiveCoinType方式

**実装**: 削除時に別のデータモデルにコピーして保存

```typescript
type CoinTypeDataModel = DataModel<{
  familyId: string
  name: string
  durationMinutes: number
  dailyDistribution: number
  active: boolean
}>

type ArchivedCoinTypeDataModel = DataModel<{
  originalId: string // 元のCoinTypeのID
  familyId: string
  name: string
  durationMinutes: number
  dailyDistribution: number
  archivedReason?: string // 削除理由（オプション）
}>
```

**キー構造**:

```
Active:   ['coinTypes', familyId, id]
Archived: ['archivedCoinTypes', familyId, id]
```

**削除フロー**:

1. CoinTypeを取得
2. ArchivedCoinTypeとして保存（同じIDを使用）
3. 元のCoinTypeを物理削除

**履歴データからの参照**:

- TimeSession、CoinTransaction等は同じ`coinTypeId`でArchiveCoinTypeを参照
- 取得時はCoinType→ArchivedCoinTypeの順で検索

**メリット**:

- アクティブなCoinTypeと削除済みが完全に分離される
- 一覧取得やフィルタリングが不要（パフォーマンス向上）
- 削除済みデータは読み取り専用として扱える
- アーカイブ理由などの追加情報を保存可能
- ストレージコストの最適化が可能（アーカイブを別ストレージに移動等）

**デメリット**:

- 2つのデータモデルを管理する必要がある
- 履歴データ参照時に2箇所を検索する必要がある
- 削除処理がトランザクショナルである必要がある（atomic操作）
- スキーマ変更時に両方のモデルを更新する必要がある
- 復元処理が複雑（ArchivedCoinType→CoinTypeへの逆移動）

**実装の考慮点**:

- `CoinTypeUseCase.getById`: CoinType→ArchivedCoinTypeの順で検索
- `CoinTypeUseCase.listAllByFamily`: CoinTypeのみ返す（archived除外）
- `CoinTypeUseCase.deleteById`: Atomic操作で移動
  ```typescript
  await deps.kv.atomic()
    .check(currentEntry,)
    .set(['archivedCoinTypes', familyId, id,], archivedCoinType,)
    .delete(['coinTypes', familyId, id,],)
    .commit()
  ```
- 復元機能を実装する場合は逆の操作

### 推奨方針の再検討

**案1（論理削除）vs 案5（ArchiveCoinType）の比較**:

| 観点                 | 案1: 論理削除 | 案5: ArchiveCoinType |
| -------------------- | ------------- | -------------------- |
| 実装の複雑さ         | シンプル      | 中程度               |
| クエリパフォーマンス | フィルタ必要  | 高速（分離済み）     |
| データモデル管理     | 1つ           | 2つ                  |
| 復元の容易さ         | 簡単          | 中程度               |
| 将来の拡張性         | 高い          | 高い                 |
| ストレージ最適化     | 難しい        | 可能                 |

**推奨**: プロジェクトの規模と要件による

- **小〜中規模、MVP段階**: **案1（論理削除）を推奨**
  - 実装がシンプル
  - 要件変更に柔軟
  - 復元が容易

- **大規模、パフォーマンス重視**: **案5（ArchiveCoinType）を検討**
  - CoinTypeが大量に作成・削除される場合
  - 履歴データの取得パフォーマンスが重要な場合
  - アーカイブデータに追加情報を保持したい場合

**理由**:

1. **データ整合性**: すべての履歴データの参照が維持される
2. **監査要件**: 金銭的価値を持つコイン管理では履歴保持が重要
3. **ユーザー体験**: 削除機能を提供しつつ、誤削除時の復元も可能
4. **実装コスト**: 既存UseCaseへの変更が最小限で済む
5. **拡張性**: 将来的な要件変更に柔軟に対応可能

**実装優先度**:

1. `CoinTypeDataModel` に `deleted: boolean` フィールド追加
2. `CoinTypeUseCase.deleteById` を論理削除に変更
3. `CoinTypeUseCase.listAllByFamily` に `deleted === false` フィルタ追加
4. `CoinTypeUseCase.getById` の削除済み処理を定義（nullを返す想定）
5. テストケースの追加・更新
6. 既存データのマイグレーション（`deleted: false` をデフォルト値として設定）

**active と deleted の使い分け**:

| フィールド      | 用途     | UI表示 | 配布 | 使用 | 復元       |
| --------------- | -------- | ------ | ---- | ---- | ---------- |
| `active: true`  | 通常運用 | ✅     | ✅   | ✅   | -          |
| `active: false` | 一時停止 | ✅     | ❌   | ✅   | 簡単       |
| `deleted: true` | 削除済み | ❌     | ❌   | ❌   | 管理者のみ |
