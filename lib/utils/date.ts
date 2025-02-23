import { BadRequestError } from '@app/lib/error.ts';

export class DATE {
  constructor(
    readonly year: number,
    readonly month = 0,
    readonly day = 0,
  ) {}

  static parse(s: string): DATE {
    const [year, month, day] = s.split('-');

    return new DATE(
      year ? Number.parseInt(year) || 0 : 0,
      month ? Number.parseInt(month) || 0 : 0,
      day ? Number.parseInt(day) || 0 : 0,
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

export const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateDate(date: string | undefined) {
  if (date && !datePattern.test(date)) {
    throw new BadRequestError(`${date} is not valid date`);
  }
}
