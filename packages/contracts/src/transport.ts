export interface TransportMessage<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly payload: T;
  readonly metadata?: Record<string, unknown>;
}

export interface LocalTransport {
  send<TReq, TRes>(message: TransportMessage<TReq>): Promise<TransportMessage<TRes>>;
}

export interface HTTPTransport {
  readonly endpointUrl: string;
  post<TReq, TRes>(path: string, payload: TReq, headers?: Record<string, string>): Promise<TRes>;
}

export interface MCPTransport {
  readonly protocolVersion: string;
  connect(): Promise<void>;
  close(): Promise<void>;
  sendRequest<TReq, TRes>(method: string, params: TReq): Promise<TRes>;
}
