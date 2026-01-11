// Serviço de Consulta FIPE via API Parallelum

const BASE_URL = "https://parallelum.com.br/fipe/api/v1";

export interface FipeMarca {
  codigo: string;
  nome: string;
}

export interface FipeModelo {
  codigo: number;
  nome: string;
}

export interface FipeAno {
  codigo: string;
  nome: string;
}

export interface FipeResult {
  TipoVeiculo: number;
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
}

type TipoVeiculoFipe = 'carros' | 'motos' | 'caminhoes';

function normalizar(txt: string): string {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function tipoToFipe(tipo: 'carro' | 'moto' | 'caminhao'): TipoVeiculoFipe {
  switch (tipo) {
    case 'carro': return 'carros';
    case 'moto': return 'motos';
    case 'caminhao': return 'caminhoes';
    default: return 'carros';
  }
}

export async function buscarMarcas(tipo: TipoVeiculoFipe): Promise<FipeMarca[]> {
  const response = await fetch(`${BASE_URL}/${tipo}/marcas`);
  if (!response.ok) throw new Error('Erro ao buscar marcas');
  return response.json();
}

export async function buscarModelos(tipo: TipoVeiculoFipe, codigoMarca: string): Promise<{ modelos: FipeModelo[], anos: FipeAno[] }> {
  const response = await fetch(`${BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos`);
  if (!response.ok) throw new Error('Erro ao buscar modelos');
  return response.json();
}

export async function buscarAnos(tipo: TipoVeiculoFipe, codigoMarca: string, codigoModelo: string): Promise<FipeAno[]> {
  const response = await fetch(`${BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos`);
  if (!response.ok) throw new Error('Erro ao buscar anos');
  return response.json();
}

export async function buscarValorFipe(tipo: TipoVeiculoFipe, codigoMarca: string, codigoModelo: string, codigoAno: string): Promise<FipeResult> {
  const response = await fetch(`${BASE_URL}/${tipo}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos/${codigoAno}`);
  if (!response.ok) throw new Error('Erro ao buscar valor FIPE');
  return response.json();
}

export async function buscarMarcaPorNome(tipo: TipoVeiculoFipe, nomeMarca: string): Promise<FipeMarca | undefined> {
  const marcas = await buscarMarcas(tipo);
  return marcas.find(m => normalizar(m.nome).includes(normalizar(nomeMarca)));
}

export async function buscarModeloPorNome(tipo: TipoVeiculoFipe, codigoMarca: string, nomeModelo: string): Promise<FipeModelo | undefined> {
  const { modelos } = await buscarModelos(tipo, codigoMarca);
  return modelos.find(m => normalizar(m.nome).includes(normalizar(nomeModelo)));
}

export async function buscarAnoPorValor(tipo: TipoVeiculoFipe, codigoMarca: string, codigoModelo: string, ano: number): Promise<FipeAno | undefined> {
  const anos = await buscarAnos(tipo, codigoMarca, codigoModelo.toString());
  return anos.find(a => a.nome.includes(ano.toString()));
}