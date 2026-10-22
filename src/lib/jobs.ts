// Pure job rules shared by forms and tests.

export type JobFormInput = {
  title: string;
  category_id: string;
  description: string;
  venue_name: string;
  positions: number;
  address: string;
  city: string;
  state: string;
  date: string; // yyyy-mm-dd
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  pay_amount: number;
  requirements: string;
  benefits: string;
  deadline_date: string; // optional yyyy-mm-dd
  deadline_time: string; // optional HH:mm
};

/** Build start/end instants; if end time <= start time the shift crosses midnight. */
export function buildShift(date: string, start: string, end: string) {
  const s = new Date(`${date}T${start}:00`);
  const e = new Date(`${date}T${end}:00`);
  if (e.getTime() <= s.getTime()) e.setDate(e.getDate() + 1);
  return { starts_at: s, ends_at: e, crossesMidnight: e.getDate() !== s.getDate() };
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function fillRate(hired: number, positions: number) {
  if (positions <= 0) return 0;
  return Math.min(100, Math.round((hired / positions) * 100));
}

export function validateJob(input: JobFormInput, opts: { publishing: boolean; now?: Date }) {
  const errors: Partial<Record<keyof JobFormInput, string>> = {};
  const now = opts.now ?? new Date();
  if (input.title.trim().length < 3) errors.title = "Informe um título com pelo menos 3 letras";
  if (input.title.trim().length > 120) errors.title = "Título muito longo";
  if (!input.city.trim()) errors.city = "Informe a cidade";
  if (!/^[A-Z]{2}$/.test(input.state.trim().toUpperCase())) errors.state = "Use a sigla do estado (ex.: SP)";
  if (!input.date) errors.date = "Informe a data";
  if (!/^\d{2}:\d{2}$/.test(input.start_time)) errors.start_time = "Horário inválido";
  if (!/^\d{2}:\d{2}$/.test(input.end_time)) errors.end_time = "Horário inválido";
  if (input.start_time && input.start_time === input.end_time) errors.end_time = "O término deve ser diferente do início";
  if (!Number.isInteger(input.positions) || input.positions < 1 || input.positions > 500)
    errors.positions = "Entre 1 e 500 profissionais";
  if (!Number.isFinite(input.pay_amount) || input.pay_amount < 0) errors.pay_amount = "Valor inválido";
  if (opts.publishing) {
    if (!input.category_id) errors.category_id = "Escolha uma categoria";
    if (!input.description.trim()) errors.description = "Descreva a vaga";
    if (!input.venue_name.trim()) errors.venue_name = "Informe o evento ou estabelecimento";
    if (!(input.pay_amount > 0)) errors.pay_amount = "Informe a remuneração";
  }
  if (input.date && !errors.start_time && !errors.end_time) {
    const { starts_at } = buildShift(input.date, input.start_time, input.end_time);
    if (opts.publishing && starts_at.getTime() <= now.getTime()) errors.date = "A data de início deve estar no futuro";
    if (input.deadline_date) {
      const d = new Date(`${input.deadline_date}T${input.deadline_time || "23:59"}:00`);
      if (d.getTime() > starts_at.getTime()) errors.deadline_date = "O prazo deve terminar antes do início";
    }
  }
  return errors;
}

export const JOB_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Aberta",
  paused: "Pausada",
  closed: "Encerrada",
  filled: "Preenchida",
};

export const APP_STATUS_LABEL: Record<string, string> = {
  applied: "Enviada",
  in_review: "Em análise",
  approved: "Aprovada",
  rejected: "Recusada",
  withdrawn: "Retirada",
  hired: "Contratado",
};

export const PROFILE_STATUS_LABEL: Record<string, string> = {
  incomplete: "Cadastro incompleto",
  pending_verification: "Aguardando verificação",
  approved: "Aprovado",
  rejected: "Recusado",
  blocked: "Bloqueado",
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(a)));
}
