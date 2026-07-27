import { proxyAuthoritativePost } from '../../_lib/authoritativeProxy';

export const onRequestPost = async (ctx: { request: Request }): Promise<Response> => (
  proxyAuthoritativePost(ctx.request, '/api/storage/delete-photo')
);
