import axios from 'axios';

export async function fetchBiliBili(uid: string): Promise<BiliBiliStats> {
  const t = await Promise.all([
    axios.get('https://api.bilibili.com/x/space/arc/search', { params: { mid: uid } }),
    axios.get('https://api.bilibili.com/x/space/acc/info', { params: { mid: uid } }),
    axios.get('https://api.bilibili.com/x/relation/stat', { params: { vmid: uid } }),
  ]);
  const res = t.map(x => x.data.data);
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
