import type express from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'net';
import { Duplex } from 'stream';

type HttpMethod = 'GET' | 'POST' | 'PATCH';

interface ResponseLike {
  status: number;
  statusCode: number;
  body: unknown;
  text: string;
  headers: Record<string, string | string[]>;
}

class MockSocket extends Duplex {
  public readonly chunks: Buffer[] = [];
  public remoteAddress = '127.0.0.1';

  _read(): void {}

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setTimeout(): this {
    return this;
  }

  setNoDelay(): this {
    return this;
  }

  setKeepAlive(): this {
    return this;
  }
}

const normalizeHeaders = (headers: Record<string, string>): IncomingHttpHeaders => {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
};

type IncomingHttpHeaders = Record<string, string>;

const parseBody = (text: string, headers: Record<string, string | string[]>): unknown => {
  const contentType = String(headers['content-type'] || '');
  if (contentType.includes('application/json') && text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
};

const executeRequest = async (
  app: express.Express,
  method: HttpMethod,
  url: string,
  headers: Record<string, string>,
  payload?: unknown,
): Promise<ResponseLike> => {
  const socket = new MockSocket();
  const httpSocket = socket as unknown as Socket;
  const req = new IncomingMessage(httpSocket);

  req.method = method;
  req.url = url;
  req.headers = normalizeHeaders(headers);
  req.socket = httpSocket;
  req.connection = httpSocket;
  if (payload !== undefined) {
    (req as IncomingMessage & { body?: unknown }).body = payload;
  }

  const res = new ServerResponse(req);
  res.assignSocket(httpSocket);

  return await new Promise<ResponseLike>((resolve, reject) => {
    res.on('finish', () => {
      const raw = Buffer.concat(socket.chunks).toString('utf8');
      const [, text = ''] = raw.split('\r\n\r\n');
      const responseHeaders = Object.fromEntries(
        Object.entries(res.getHeaders()).map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : String(value)]),
      );

      resolve({
        status: res.statusCode,
        statusCode: res.statusCode,
        body: parseBody(text, responseHeaders),
        text,
        headers: responseHeaders,
      });
    });

    (app as unknown as { handle(req: IncomingMessage, res: ServerResponse, callback: (error?: unknown) => void): void })
      .handle(req, res, reject);
  });
};

class RequestBuilder implements PromiseLike<ResponseLike> {
  private readonly headers: Record<string, string> = {};
  private payload: unknown;

  constructor(
    private readonly app: express.Express,
    private readonly method: HttpMethod,
    private readonly url: string,
  ) {}

  set(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  send(payload: unknown): this {
    this.payload = payload;
    return this;
  }

  then<TResult1 = ResponseLike, TResult2 = never>(
    onfulfilled?: ((value: ResponseLike) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return executeRequest(this.app, this.method, this.url, this.headers, this.payload).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<ResponseLike | TResult> {
    return executeRequest(this.app, this.method, this.url, this.headers, this.payload).catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<ResponseLike> {
    return executeRequest(this.app, this.method, this.url, this.headers, this.payload).finally(onfinally ?? undefined);
  }
}

const request = (app: express.Express) => ({
  get: (url: string) => new RequestBuilder(app, 'GET', url),
  post: (url: string) => new RequestBuilder(app, 'POST', url),
  patch: (url: string) => new RequestBuilder(app, 'PATCH', url),
});

export default request;
