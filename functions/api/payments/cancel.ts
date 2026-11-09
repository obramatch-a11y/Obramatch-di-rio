import { proxyAuthoritativePost } from '../../_lib/authoritativeProxy';

export function onRequestPost(context: { request: Request }): Promise<Response> {
  return proxyAuthoritativePost(context.request, '/api/payments/cancel');
}

