export default class Events<TArg> {
  private _callbacks = new Set<(arg: TArg) => void>();

  /**
   * Adds an error subscriber which is called when an error is happened in the
   * background. Returns a function to unsubscribe.
   */
  subscribe(callback: (args: TArg) => void): () => void {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  /**
   * Emits an error to all the subscribed callbacks.
   */
  emit(arg: TArg): void {
    this._callbacks.forEach((callback) => callback(arg));
  }
}
