export class NoiseGenerator {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed || Math.random() * 65536;
  }

  get2D(x: number, y: number): number {
    // Simple Perlin noise implementation
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;

    return this.lerp(v,
      this.lerp(u,
        this.grad(this.p[A], x, y),
        this.grad(this.p[B], x - 1, y)
      ),
      this.lerp(u,
        this.grad(this.p[A + 1], x, y - 1),
        this.grad(this.p[B + 1], x - 1, y - 1)
      )
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const grad = 1 + (h & 7);
    return ((h & 8) ? -grad : grad) * x + ((h & 4) ? -grad : grad) * y;
  }

  private p = new Array(512);

  {
    // Initialize the permutation array
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    for (let i = 0; i < 255; i++) {
      const r = i + ~~(Math.random() * (256 - i));
      const aux = this.p[i];
      this.p[i] = this.p[r];
      this.p[r] = aux;
    }

    for (let i = 256; i < 512; i++) {
      this.p[i] = this.p[i & 255];
    }
  }
} 