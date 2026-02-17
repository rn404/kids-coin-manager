## 命名規則

- ファイル命名規則は、`${issue の起票日をYYYY-MM-DDで}_${issueのサマリがわかる名付け}.md` とする

## Status

- ドキュメントの冒頭に、Status を明記する
- Status は以下を使う
  - `Draft`: 提案の草案、まだ課題は決定的ではなく、仮説の段階
  - `Proposed` : 課題内容は FIX し、対応策の検討は未着手
  - `Planned` : 課題内容に対し、対応策が決定された状態
  - `Applied` : 課題内容に対する内容が完了した状態

### Status とセクションの対応

| Status   | Summary | Details | Approach | Results | Feedback |
| -------- | ------- | ------- | -------- | ------- | -------- |
| Draft    | o       |         |          |         |          |
| Proposed | o       | o       |          |         |          |
| Planned  | o       | o       | o        |         |          |
| Applied  | o       | o       | o        | o       | o        |

## Document format

```
Status: ${status}

# Summary

${課題の概要。何を解決したいのか、何を実現したいのかを簡潔に記載する}

---

# Details

${課題の詳細。背景情報、具体的な要件、受け入れ条件などを記載する}

# Approach

${対応方針。技術的なアプローチ、実装方法、設計判断などを記載する}

---

# Results

${対応結果。実装内容、変更点の要約などを記載する}

# References

${関連するドキュメント、PR、外部リンクなどを記載する}

# Feedback

${完了後の振り返り。レビュー結果、学び、改善点などを記載する}
```
