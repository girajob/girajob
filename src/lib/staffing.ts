export type StaffRole = { category_id: string; label: string; positions: number; pay_amount: number; entry_time: string };
export type CatalogItem = { id: string; name: string; amount: number; active: boolean };

export function roleFromCatalog(item: CatalogItem, positions: number, entryTime: string, categories: { id: string; name: string }[]): StaffRole {
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const category = categories.find((c) => normalize(item.name).includes(normalize(c.name)));
  return { label: item.name, pay_amount: Number(item.amount), positions, entry_time: entryTime, category_id: category?.id ?? "" };
}

export function staffingTotals(roles: StaffRole[]) {
  return roles.reduce((total, role) => ({ positions: total.positions + role.positions, amount: total.amount + role.positions * role.pay_amount }), { positions: 0, amount: 0 });
}