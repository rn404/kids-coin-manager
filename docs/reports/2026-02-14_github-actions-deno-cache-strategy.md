# GitHub Actions における Deno キャッシュ戦略の調査

## 背景

CI の実行時間短縮のため、GitHub Actions で Deno の依存関係キャッシュを導入したい。
初回の実装で `DENO_DIR: ~/.cache/deno` を `env:` ブロックに設定したところ、`~` が展開されずワーキングディレクトリからの相対パス (`./~/.cache/deno/`) として解釈された。
結果、npm キャッシュがリポジトリ内に作成され、`deno test` がキャッシュ内の npm パッケージのテストファイルを発見して型チェックエラーとなった。

## 調査対象

Deno v2 系を使用し、最終更新が半年以内（2025年8月以降）の稼働リポジトリを対象とした。

## 調査結果

### 方式 A: `denoland/setup-deno@v2` の `cache: true`（公式推奨）

`denoland/setup-deno@v2` には組み込みキャッシュ機能があり、`cache: true` を指定するだけで有効化できる。

```yaml
- uses: denoland/setup-deno@v2
  with:
    deno-version: v2.x
    cache: true
```

内部動作（ソースコード `src/cache.ts` より）:

- `deno info --json` で `DENO_DIR` を自動検出（パス展開の問題が起きない）
- キャッシュキー: `deno-cache-{OS}-{Arch}-{JobID}-{hashFiles('**/deno.lock')}`
- restore-keys によるフォールバックも自動実装
- `@actions/cache` パッケージを内部で直接使用

#### 採用リポジトリ

| リポジトリ     | 備考                                       |
| -------------- | ------------------------------------------ |
| denoland/fresh | Deno 公式 Web フレームワーク               |
| denoland/std   | Deno 標準ライブラリ（全5ジョブで統一使用） |

### 方式 B: `actions/cache` 手動設定

`actions/cache@v4` を手動で設定し、`DENO_DIR` を明示的に指定する方式。

#### 採用リポジトリ

| リポジトリ            | DENO_DIR                           | キャッシュキー                   |
| --------------------- | ---------------------------------- | -------------------------------- |
| p2p-industries/hyveos | `/tmp/${{ matrix.package }}-cache` | パッケージ名+用途（固定キー）    |
| pcardune/paul-db      | `/tmp/.deno-cache`                 | `hashFiles('deno.lock')`         |
| ArekX/note-me         | `/home/runner/.deno-cache`         | `hashFiles('deno.lock')`         |
| hasundue/actions      | 未設定（OS別デフォルトパスを列挙） | `arch+os+hashFiles('deno.lock')` |

共通パターンとして、`~` ではなく**絶対パス**で `DENO_DIR` を設定している。

### 方式 C: キャッシュなし

| リポジトリ      | 備考                                          |
| --------------- | --------------------------------------------- |
| oakserver/oak   | canary のみでテストのためキャッシュ効果が薄い |
| grammyjs/grammY | キャッシュ未設定                              |

## 比較

| 項目                   | `cache: true`                   | `actions/cache` 手動   |
| ---------------------- | ------------------------------- | ---------------------- |
| 設定量                 | 1行                             | 5-10行                 |
| DENO_DIR の管理        | 自動検出                        | 明示的に設定が必要     |
| キャッシュキーの柔軟性 | `cache-hash` でカスタマイズ可能 | 完全にカスタマイズ可能 |
| Job ID の分離          | 自動で含まれる                  | 手動で入れる必要あり   |
| パス展開リスク         | なし                            | `~` 使用時に注意が必要 |
| 公式サポート           | 公式推奨                        | セルフメンテナンス     |

## 結論

**`cache: true` を採用する。** 理由:

1. Deno 公式リポジトリ（fresh, std）が全てこの方式に移行済み
2. `DENO_DIR` の自動検出により、パス展開の問題が根本的に発生しない
3. キャッシュキーに Job ID が自動で含まれ、ジョブ間のキャッシュ汚染を防げる
4. 設定が最小限で、メンテナンスコストが低い
