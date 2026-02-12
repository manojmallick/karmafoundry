export function getDayKey(rolloverHour: number): string {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  
  if (utc.getUTCHours() < rolloverHour) {
    utc.setUTCDate(utc.getUTCDate() - 1);
  }
  
  return utc.toISOString().split("T")[0];
}
