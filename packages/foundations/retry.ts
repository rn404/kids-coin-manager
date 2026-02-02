interface RetryOptions {
  /**
   * 最大リトライ回数（デフォルト: 3）
   */
  maxRetries?: number
  /**
   * バックオフの基本時間（ミリ秒）（デフォルト: 100）
   * 実際の待機時間は 2^(試行回数) * backoffMultiplier
   */
  backoffMultiplier?: number
}

/**
 * 関数を実行し、エラーが発生した場合は指数バックオフでリトライする
 *
 * @param operation - 実行する非同期関数
 * @param options - リトライ設定
 * @returns 関数の実行結果
 * @throws 最大リトライ回数に達した場合のエラー
 *
 * @see retry_test.ts 使用例はテストコードを参照
 */
export const withRetry = async <T,>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const { maxRetries = 3, backoffMultiplier = 100, } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        await new Promise((resolve,) =>
          setTimeout(resolve, Math.pow(2, attempt + 1,) * backoffMultiplier,)
        )
      }
    }
  }

  throw new Error(
    `Failed after ${maxRetries} retries: ${lastError?.message}`,
  )
}
