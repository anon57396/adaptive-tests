const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class AsyncWorker {
  private history: string[] = [];

  public async compute(input: number): Promise<number> {
    await delay(1);
    const result = input * 2;
    this.history.push(`compute:${input}`);
    return result;
  }

  public async *entries(limit = this.history.length): AsyncGenerator<string, void, void> {
    let count = 0;
    for (const item of this.history) {
      if (count >= limit) {
        break;
      }
      await delay(1);
      yield item;
      count += 1;
    }
  }

  public queueTask = async (label: string): Promise<string> => {
    await delay(1);
    this.history.push(`task:${label}`);
    return `queued:${label}`;
  };

  public static async ready(): Promise<AsyncWorker> {
    await delay(1);
    return new AsyncWorker();
  }
}

export async function createAsyncWorker(): Promise<AsyncWorker> {
  return AsyncWorker.ready();
}
