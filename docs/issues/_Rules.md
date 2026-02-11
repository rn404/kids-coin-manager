- ファイル命名規則は、`${issue の起票日をYYYY-MM-DDで}_${issueのサマリがわかる名付け}` とする
- ドキュメントの冒頭に、Status を明記する
- Status は以下を使う
  - `Draft`: 提案の草案、まだ課題は決定的ではなく、仮説の段階
  - `Proposed` : 課題内容は FIX し、対応策の検討は未着手
  - `Planned` : 課題内容に対し、対応策が決定された状態
  - `Applied` : 課題内容に対する内容が完了した状態

### Status とセクションの対応

| Status   | Summary | Details | Approach | Results |
| -------- | ------- | ------- | -------- | ------- |
| Draft    | o       |         |          |         |
| Proposed | o       | o       |          |         |
| Planned  | o       | o       | o        |         |
| Applied  | o       | o       | o        | o       |

## Document format

```
Status: ${status}

# Summary

----

# Details

# Approach

----

# Results
```
