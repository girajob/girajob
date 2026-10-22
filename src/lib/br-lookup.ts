// Consultas a APIs públicas brasileiras (ViaCEP e BrasilAPI) para autocompletar cadastros.

export type CepInfo = { logradouro: string; bairro: string; localidade: string; uf: string };

export async function fetchCep(cep: string): Promise<CepInfo | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return { logradouro: data.logradouro ?? "", bairro: data.bairro ?? "", localidade: data.localidade ?? "", uf: data.uf ?? "" };
  } catch {
    return null;
  }
}

export type CnpjInfo = { razao_social: string; nome_fantasia: string; logradouro: string; bairro: string; municipio: string; uf: string; cep: string };

export async function fetchCnpj(cnpj: string): Promise<CnpjInfo | null> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.razao_social) return null;
    return {
      razao_social: d.razao_social ?? "",
      nome_fantasia: d.nome_fantasia ?? "",
      logradouro: d.logradouro ?? "",
      bairro: d.bairro ?? "",
      municipio: d.municipio ?? "",
      uf: d.uf ?? "",
      cep: d.cep ?? "",
    };
  } catch {
    return null;
  }
}
