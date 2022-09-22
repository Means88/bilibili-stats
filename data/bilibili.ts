import axios, { AxiosRequestHeaders } from 'axios';

const headers: AxiosRequestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.123 Safari/537.36',
  'sec-ch-ua': '"Chromium";v="104", " Not A;Brand";v="99", "Sidekick";v="104"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': "macOS",
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
}

if (process.env.COOKIE) {
  headers.cookie = process.env.COOKIE
}

const request = axios.create({
  headers,
})

export async function fetchBiliBili(uid: string): Promise<BiliBiliStats> {
  const t = await Promise.all([
    request.get('https://api.bilibili.com/x/space/arc/search', { params: { mid: uid } }),
    request.get('https://api.bilibili.com/x/space/acc/info', { params: { mid: uid } }),
    request.get('https://api.bilibili.com/x/relation/stat', { params: { vmid: uid } }),
  ]);
  const res = t.map(x => x.data.data);
  console.log(res[1])
  return {
    username: res[1].name,
    followers: res[2].follower,
    followings: res[2].following,
    recentViews: res[0].list.vlist.reduce((sum: number, v: any) => sum + v.play, 0),
    videos: res[0].page.count,
    description: res[1].sign,
    level: res[1].level,
  };
}

export interface BiliBiliStats {
  username: string;
  followers: number;
  followings: number;
  recentViews: number;
  videos: number;
  level: number;
  description: string;
}
