/**
 * Distinguish the one load caused by mounting trusted bytes from any later navigation in the
 * same iframe. This is defense-in-depth: exact-byte approval remains the executable-code trust
 * boundary.
 */
export class FrameLoadGuard {
  private expected = false;

  expectNext(): void {
    this.expected = true;
  }

  reset(): void {
    this.expected = false;
  }

  accept(): boolean {
    if (!this.expected) return false;
    this.expected = false;
    return true;
  }
}
