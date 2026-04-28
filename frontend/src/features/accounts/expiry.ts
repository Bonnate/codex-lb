function formatDateOnlyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultAccountExpiryDate(baseDate = new Date()): string {
  const targetMonth = baseDate.getMonth() + 1;
  const target = new Date(baseDate.getFullYear(), targetMonth, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(baseDate.getDate(), lastDayOfTargetMonth));
  return formatDateOnlyLocal(target);
}
