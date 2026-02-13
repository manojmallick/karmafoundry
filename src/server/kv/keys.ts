export const NS = "KF:v1";

export const kState = (s: string, d: string) => `${NS}:${s}:${d}:state`;
export const kVotes = (s: string, d: string) => `${NS}:${s}:${d}:votes`;
export const kLb    = (s: string, d: string) => `${NS}:${s}:${d}:lb`;
export const kLbUser = (s: string, d: string, u: string) => `${NS}:${s}:${d}:lb:${u}`;
export const kLbName = (s: string, d: string, u: string) => `${NS}:${s}:${d}:lb:names:${u}`;
export const kLbTop = (s: string, d: string) => `${NS}:${s}:${d}:lb:top`;
export const kUsers = (s: string, d: string) => `${NS}:${s}:${d}:users`;
export const kCfg   = (s: string) => `${NS}:${s}:config`;
export const kMeta  = (s: string) => `${NS}:${s}:meta`;
export const kPoll  = (s: string, d: string) => `${NS}:${s}:${d}:poll`;
export const kAudit = (s: string, d: string) => `${NS}:${s}:${d}:audit`;
export const kContribUser = (s: string, d: string, u: string) => `${NS}:${s}:${d}:contrib:${u}`;
export const kContribList = (s: string, d: string) => `${NS}:${s}:${d}:contributors`;
export const kTop3 = (s: string, d: string) => `${NS}:${s}:${d}:top3`;
export const kCompletedAt = (s: string, d: string) => `${NS}:${s}:${d}:completedAt`;
export const kCompletedNotified = (s: string, d: string) => `${NS}:${s}:${d}:completedNotified`;
