import { describe, it, expect } from "vitest";
import { buildShift, rangesOverlap, fillRate, validateJob, type JobFormInput } from "./jobs";

const base: JobFormInput = {
  title: "Garçom para casamento", category_id: "c1", description: "Servir mesas", venue_name: "Espaço X",
  positions: 2, address: "", city: "São Paulo", state: "SP", date: "2030-05-10", start_time: "18:00",
  end_time: "23:00", pay_amount: 180, requirements: "", benefits: "", deadline_date: "", deadline_time: "",
};

describe("job rules", () => {
  it("shift that ends before it starts crosses midnight into next day", () => {
    const s = buildShift("2030-05-10", "22:00", "04:00");
    expect(s.ends_at.getTime() - s.starts_at.getTime()).toBe(6 * 3600 * 1000);
    expect(s.crossesMidnight).toBe(true);
  });
  it("detects overlap between a midnight-crossing shift and an early-morning shift", () => {
    const a = buildShift("2030-05-10", "22:00", "04:00");
    const b = buildShift("2030-05-11", "02:00", "06:00");
    expect(rangesOverlap(a.starts_at, a.ends_at, b.starts_at, b.ends_at)).toBe(true);
  });
  it("back-to-back shifts do not conflict", () => {
    const a = buildShift("2030-05-10", "18:00", "22:00");
    const b = buildShift("2030-05-10", "22:00", "23:30");
    expect(rangesOverlap(a.starts_at, a.ends_at, b.starts_at, b.ends_at)).toBe(false);
  });
  it("fill rate is hired over requested positions", () => {
    expect(fillRate(1, 4)).toBe(25);
    expect(fillRate(5, 4)).toBe(100);
  });
  it("publishing a job in the past is rejected", () => {
    const e = validateJob({ ...base, date: "2020-01-01" }, { publishing: true });
    expect(e.date).toBeDefined();
  });
  it("application deadline after start is rejected", () => {
    const e = validateJob({ ...base, deadline_date: "2030-05-11" }, { publishing: true });
    expect(e.deadline_date).toBeDefined();
  });
  it("a valid job has no errors", () => {
    expect(validateJob(base, { publishing: true, now: new Date("2030-01-01") })).toEqual({});
  });
});
