export class DATE {
  constructor(
    readonly year?: number,
    readonly month?: number,
    readonly day?: number,
  ) {}

  static parse(s: string): DATE {
    const [year, month, day] = s.split('-');

    return new DATE(
      year ? Number.parseInt(year) || 0 : undefined,
      month ? Number.parseInt(month) || 0 : undefined,
      day ? Number.parseInt(day) || 0 : undefined,
    );
  }

  toString(): string {
    if (!this.year) {
      return '';
    }

    let s = this.year.toString().padStart(4, '0');
    if (!this.month) {
      return s;
    }

    s += `-${this.month.toString().padStart(2, '0')}`;

    if (!this.day) {
      return s;
    }

    s += `-${this.day.toString().padStart(2, '0')}`;

    return s;
  }
}
