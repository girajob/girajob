import { describe, expect, it } from "vitest";
import { roleFromCatalog, staffingTotals } from "./staffing";

describe("quadro de funcionários do catálogo", () => {
  it("imports the registered role and price with the selected quantity and entry time", () => {
    expect(roleFromCatalog({ id: "1", name: "Garçom", amount: 180, active: true }, 10, "13:00", [{ id: "garcom", name: "Garçom" }])).toEqual({ category_id: "garcom", label: "Garçom", positions: 10, pay_amount: 180, entry_time: "13:00" });
  });
  it("assembles 10 waiters, 10 cashiers and 10 cleaners with their own prices", () => {
    const roles = [{ name: "Garçom", amount: 180 }, { name: "Caixa", amount: 200 }, { name: "Faxineiro", amount: 150 }].map((item, i) => roleFromCatalog({ ...item, id: String(i), active: true }, 10, "10:00", []));
    expect(staffingTotals(roles)).toEqual({ positions: 30, amount: 5300 });
  });
  it("keeps an imported event price unchanged when the catalog is edited", () => {
    const item = { id: "1", name: "Caixa", amount: 200, active: true };
    const role = roleFromCatalog(item, 10, "13:00", []);
    item.amount = 250;
    expect(role.pay_amount).toBe(200);
  });
});