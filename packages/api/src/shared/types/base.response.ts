export class FlagsBaseResponse<T> {
  readonly data: T;
  readonly statusCode: number;
  readonly timestamp: string;

  constructor(data: T, statusCode: number) {
    this.data = data;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}
