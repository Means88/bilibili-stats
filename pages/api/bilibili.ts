// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBiliBili } from '../../data/bilibili';
import { bilibiliCard } from '../../render/bilibili';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (!req.query.uid) {
    return res.status(400);
  }
  const data = await fetchBiliBili(req.query.uid as string);
  res.status(200).setHeader('content-type', 'image/svg+xml').send(bilibiliCard(data));
}
